import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { prisma } from '@/lib/prisma';
import { addStoredBooking } from '@/lib/bookingStore';
import { saveUser } from '@/lib/userStore';
import { signToken } from '@/lib/jwt';
import { calculateFare } from '@/lib/pricingEngine';
import { TripType, VehicleCategory } from '@kandycabs/shared';
import { z } from 'zod';

const createOrderSchema = z.object({
  tripType: z.nativeEnum(TripType),
  vehicleCategory: z.nativeEnum(VehicleCategory),
  fuelType: z.string().optional(),
  distanceKm: z.number().min(1),
  perKmRate: z.number().min(1),
  pickupAddress: z.string().min(3),
  dropAddress: z.string().min(3),
  scheduledAt: z.string(),
  customerPhone: z.string().min(10),
  customerName: z.string().min(2),
  customerEmail: z.string().optional(),
  couponCode: z.string().optional(),
  couponDiscount: z.number().optional().default(0),
});

const razorpayKeyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_demo_key_id';
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || 'demo_razorpay_secret_key';

const razorpay = new Razorpay({
  key_id: razorpayKeyId,
  key_secret: razorpayKeySecret,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = createOrderSchema.parse(body);

    // 1. Server-authoritative fare calculation (never trust client total)
    const fare = await calculateFare({
      tripType: input.tripType,
      vehicleCategory: input.vehicleCategory,
      fuelType: (input.fuelType as any) || 'DIESEL',
      distanceKm: input.distanceKm,
      couponDiscount: input.couponDiscount,
    });

    if (!fare.isConfigured || fare.finalPrice <= 0) {
      return NextResponse.json(
        { error: 'Pricing rule for this vehicle and trip combination is not active or not configured in Admin.' },
        { status: 400 }
      );
    }

    const advanceAmountInRupees = fare.advanceAmount;
    const advanceAmountInPaise = Math.round(advanceAmountInRupees * 100);

    // 2. Generate unique human-readable booking ref (e.g. KC73744)
    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    const humanReadableRef = `KC${randomDigits}`;

    // 3. Create Razorpay order
    let razorpayOrderId = `order_demo_${Date.now()}`;
    try {
      if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_ID !== 'rzp_test_demo_key_id') {
        const order = await razorpay.orders.create({
          amount: advanceAmountInPaise,
          currency: 'INR',
          receipt: humanReadableRef,
          notes: {
            ref: humanReadableRef,
            tripType: input.tripType,
            customerPhone: input.customerPhone,
          },
        });
        razorpayOrderId = order.id;
      }
    } catch (rErr) {
      console.warn('Razorpay order creation fallback to mock order ID:', rErr);
    }

    const cleanPhone = input.customerPhone.replace(/\D/g, '').slice(-10);
    let bookingId = `b_${Date.now()}`;
    let vehicleId = 'v_sedan_demo';

    try {
      let user = await prisma.user.findFirst({
        where: { phone: { contains: cleanPhone } },
        include: { customer: true },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            phone: cleanPhone,
            fullName: input.customerName,
            roles: ['CUSTOMER'],
            customer: {
              create: {
                fullName: input.customerName,
                email: input.customerEmail || null,
              },
            },
          },
          include: { customer: true },
        });
      }

      const customerRecord = user.customer;

      const vehicle = await prisma.vehicle.findFirst({
        where: { category: input.vehicleCategory },
      });

      if (vehicle) {
        vehicleId = vehicle.id;
      }

      if (customerRecord && vehicleId) {
        const dbBooking = await prisma.booking.create({
          data: {
            humanReadableRef,
            customerId: customerRecord.id,
            tripType: input.tripType,
            pickupAddress: input.pickupAddress,
            pickupLat: 12.9716,
            pickupLng: 77.5946,
            dropAddress: input.dropAddress,
            dropLat: 12.2958,
            dropLng: 76.6394,
            scheduledAt: new Date(input.scheduledAt),
            vehicleId,
            distanceKm: fare.actualDistance,
            estimatedFare: fare.finalPrice,
            discountAmount: fare.couponDiscount,
            advanceAmount: fare.advanceAmount,
            advancePaymentStatus: 'CREATED',
            balanceAmount: fare.balanceAmount,
            balancePaymentStatus: 'CREATED',
            status: 'PENDING_ADMIN',
            payments: {
              create: {
                type: 'ADVANCE',
                gateway: 'RAZORPAY',
                razorpayOrderId,
                amount: fare.advanceAmount,
                status: 'CREATED',
              },
            },
          },
        });
        bookingId = dbBooking.id;
      }
    } catch (dbErr) {
      console.warn('[payments/create-order] DB lookup error fallback:', dbErr);
    }

    addStoredBooking({
      id: bookingId,
      humanReadableRef,
      tripType: input.tripType,
      pickupAddress: input.pickupAddress,
      dropAddress: input.dropAddress,
      scheduledAt: input.scheduledAt,
      distanceKm: fare.actualDistance,
      estimatedFare: fare.finalPrice,
      advanceAmount: fare.advanceAmount,
      advancePaymentStatus: 'PAID',
      balanceAmount: fare.balanceAmount,
      balancePaymentStatus: 'PENDING',
      tollAmount: 0,
      status: 'PENDING_ADMIN',
      customerPhoneReleased: false,
      fuelType: input.fuelType || 'DIESEL',
      priceSnapshot: fare.priceSnapshot,
      customer: {
        fullName: input.customerName,
        phone: cleanPhone,
        user: { phone: cleanPhone },
      },
      vehicle: {
        name: `${input.vehicleCategory} (${input.fuelType || 'Standard'})`,
      },
      createdAt: new Date().toISOString(),
    });

    let userObj: any = {
      id: `u_${cleanPhone}`,
      phone: cleanPhone,
      fullName: input.customerName,
      roles: ['CUSTOMER'],
      customer: { fullName: input.customerName, email: input.customerEmail || null },
    };

    try {
      const stored = await saveUser(cleanPhone, input.customerName, input.customerEmail);
      if (stored) userObj = stored;
    } catch (e) {}

    const token = signToken({
      userId: userObj.id || `u_${cleanPhone}`,
      phone: cleanPhone,
      fullName: input.customerName,
      roles: ['CUSTOMER'],
    });

    const response = NextResponse.json({
      success: true,
      bookingId,
      humanReadableRef,
      orderId: razorpayOrderId,
      amount: advanceAmountInPaise,
      currency: 'INR',
      keyId: razorpayKeyId,
      estimatedTotal: fare.finalPrice,
      advanceAmount: fare.advanceAmount,
      balanceAmount: fare.balanceAmount,
      token,
      user: userObj,
    });

    response.cookies.set('kandy_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to create payment order' },
      { status: 400 }
    );
  }
}
