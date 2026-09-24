import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@kandy-cabs/db';
import {
  verifyAuthToken,
  calculateFare,
  generateOtp,
  VehicleCategory,
  TripType,
  PaymentType,
  PaymentStatus,
  BookingStatus,
} from '@kandy-cabs/shared';
import { calculateRouteDistance } from '@/lib/distance';
import { setCorsHeaders, handleOptions } from '@/lib/cors';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return handleOptions();
}

function generateBookingReference(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `KC-${year}-${random}`;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user from cookie or Bearer header
    let token = req.cookies.get('kandy_session')?.value;
    if (!token) {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      }
    }

    if (!token) {
      const res = NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required to create booking' },
        { status: 401 }
      );
      return setCorsHeaders(res);
    }

    const payload = await verifyAuthToken(token);
    if (!payload || !payload.userId) {
      const res = NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid or expired token' },
        { status: 401 }
      );
      return setCorsHeaders(res);
    }

    // Ensure customer record exists
    let customer = await prisma.customer.findUnique({
      where: { userId: payload.userId },
    });
    if (!customer) {
      customer = await prisma.customer.create({
        data: { userId: payload.userId },
      });
    }

    const body = await req.json();
    const {
      pickupAddress,
      pickupLat,
      pickupLng,
      dropAddress,
      dropLat,
      dropLng,
      category = VehicleCategory.SEDAN,
      fuelType,
      tripType = TripType.ONEWAY,
      scheduledAt = new Date().toISOString(),
      durationDays = 1,
      packageHours = 8,
      couponCode,
      razorpayOrderId,
      razorpayPaymentId,
      idempotencyKey,
      passengerName,
      passengerPhone,
      passengerEmail,
      paymentMode,
      notes,
    } = body;

    // Update user profile full name and customer email if provided
    if (passengerName) {
      try {
        await prisma.user.update({
          where: { id: payload.userId },
          data: {
            fullName: String(passengerName).trim(),
          },
        });
      } catch (e) {}
    }
    if (passengerEmail) {
      try {
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            email: String(passengerEmail).trim(),
          },
        });
      } catch (e) {}
    }

    if (!pickupAddress || !dropAddress || typeof pickupLat !== 'number' || typeof dropLat !== 'number') {
      const res = NextResponse.json(
        { success: false, message: 'Pickup and drop location details are required' },
        { status: 400 }
      );
      return setCorsHeaders(res);
    }

    // Must have advance payment / order id or idempotency key
    const headerIdemp = req.headers.get('idempotency-key') || req.headers.get('x-idempotency-key');
    const orderRef = razorpayOrderId || idempotencyKey || headerIdemp || `order_app_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    // Idempotency check: if payment with this razorpayOrderId already exists, return existing booking
    const existingPayment = await prisma.payment.findFirst({
      where: { razorpayOrderId: orderRef },
      include: { booking: true },
    });

    if (existingPayment && existingPayment.booking) {
      const res = NextResponse.json(
        {
          success: true,
          isDuplicate: true,
          booking: existingPayment.booking,
          message: 'Booking already confirmed',
        },
        { status: 200 }
      );
      return setCorsHeaders(res);
    }

    // 2. Authoritative server distance calculation
    const route = await calculateRouteDistance(pickupLat, pickupLng, dropLat, dropLng);
    const distanceKm = route.distanceKm;

    // 3. Authoritative server fare calculation (ignores any client-submitted amounts)
    const pricing = calculateFare({
      category,
      fuelType,
      tripType,
      distanceKm,
      scheduledAt,
      durationDays,
      packageHours,
      couponCode,
    });

    const isPayOnDrop = paymentMode === 'PAY_ON_DROP' || paymentMode === 'CASH';
    const advanceAmount = isPayOnDrop ? 0 : pricing.advanceAmount;
    const advancePaymentStatus = isPayOnDrop ? PaymentStatus.PENDING : PaymentStatus.PAID;
    const balanceAmount = isPayOnDrop ? pricing.totalFare : pricing.balanceAmount;

    const humanReadableRef = generateBookingReference();
    const pickupOtp = generateOtp(4);

    // 4. Atomic Database Transaction
    const newBooking = await prisma.$transaction(async (tx) => {
      // 1. Create Booking
      const booking = await tx.booking.create({
        data: {
          humanReadableRef,
          customerId: customer.id,
          tripType,
          pickupAddress,
          pickupLat,
          pickupLng,
          dropAddress,
          dropLat,
          dropLng,
          scheduledAt: new Date(scheduledAt),
          distanceKm: pricing.billableDistanceKm,
          estimatedFare: pricing.totalFare,
          advanceAmount: advanceAmount,
          advancePaymentStatus: advancePaymentStatus,
          balanceAmount: balanceAmount,
          balancePaymentStatus: PaymentStatus.PENDING,
          status: BookingStatus.PENDING_ADMIN,
          pickupOtp,
          customerLocationSharingEnabled: true,
          driverAllowance: pricing.driverAllowance || 350.0,
          driverPayeeAmount: 0.0,
          driverPaymentStatus: PaymentStatus.PENDING,
        },
      });

      // 2. Create Advance Payment
      await tx.payment.create({
        data: {
          bookingId: booking.id,
          type: PaymentType.ADVANCE,
          amount: advanceAmount,
          razorpayOrderId: orderRef,
          razorpayPaymentId: razorpayPaymentId || (isPayOnDrop ? `pay_cash_${Date.now()}` : `pay_mock_${Date.now()}`),
          status: advancePaymentStatus,
          verifiedAt: isPayOnDrop ? null : new Date(),
        },
      });

      // 3. Create initial TripEvent
      await tx.tripEvent.create({
        data: {
          bookingId: booking.id,
          type: 'BOOKING_CREATED',
          payloadJson: {
            source: 'web',
            category,
            tripType,
            advancePaid: pricing.advanceAmount,
            balanceDue: pricing.balanceAmount,
            razorpayOrderId: orderRef,
          },
        },
      });

      // 4. Create AuditLog
      await tx.auditLog.create({
        data: {
          actorUserId: payload.userId,
          action: 'CREATE_BOOKING',
          entityType: 'Booking',
          entityId: booking.id,
          reason: `Customer booked ${category} (${tripType}) with ₹${pricing.advanceAmount} advance paid.`,
        },
      });

      return booking;
    }, {
      maxWait: 10000,
      timeout: 25000,
    });

    const response = NextResponse.json(
      {
        success: true,
        booking: newBooking,
        message: 'Booking created successfully and pending admin dispatch',
      },
      { status: 201 }
    );
    return setCorsHeaders(response);
  } catch (error: any) {
    console.error('Error in POST /api/customer/bookings:', error);
    const res = NextResponse.json(
      { success: false, message: error.message || 'Failed to create booking' },
      { status: 500 }
    );
    return setCorsHeaders(res);
  }
}
