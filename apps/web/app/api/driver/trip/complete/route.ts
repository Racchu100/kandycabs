import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@kandy-cabs/db';
import { getDriverSession } from '@/lib/driver-auth';
import { BookingStatus, PaymentStatus, PaymentType } from '@kandy-cabs/shared';
import { setCorsHeaders, handleOptions } from '@/lib/cors';
import { RealtimeEvents } from '@/lib/realtime-events';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(req: NextRequest) {
  try {
    const session = await getDriverSession(req);
    if (!session) {
      const res = NextResponse.json(
        { error: 'Unauthorized', message: 'Driver authentication required' },
        { status: 401 }
      );
      return setCorsHeaders(res);
    }

    const body = await req.json();
    const {
      bookingId,
      finalOdometer,
      finalOdometerImagePath,
      tollAmount = 0,
      parkingAmount = 0,
      paymentMethod = 'CASH', // CASH or UPI_QR
    } = body;

    if (!bookingId || finalOdometer === undefined) {
      const res = NextResponse.json(
        { success: false, message: 'Booking ID and final odometer reading are required' },
        { status: 400 }
      );
      return setCorsHeaders(res);
    }

    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        assignedDriverId: session.driverId,
      },
    });

    if (!booking) {
      const res = NextResponse.json(
        { success: false, message: 'Booking not found or not assigned to you' },
        { status: 404 }
      );
      return setCorsHeaders(res);
    }

    const startOdo = Number(booking.startingOdometer || 0);
    const endOdo = parseFloat(String(finalOdometer));

    // Calculate actual distance from start/end odometer readings
    const actualDistanceKm = Math.max(0, Math.round((endOdo - startOdo) * 10) / 10);
    const parsedToll = Math.max(0, parseFloat(String(tollAmount)) || 0);
    const parsedParking = Math.max(0, parseFloat(String(parkingAmount)) || 0);

    const baseBalance = Number(booking.balanceAmount);
    const totalBalanceCollected = baseBalance + parsedToll + parsedParking;

    // Atomic Transaction: complete trip, record odometer reconciliation, tolls/parking, and balance Payment
    const updated = await prisma.$transaction(
      async (tx) => {
        // 1. Update Booking
        const completedBooking = await tx.booking.update({
          where: { id: bookingId },
          data: {
            status: BookingStatus.TRIP_COMPLETED,
            finalOdometer: endOdo,
            finalOdometerImagePath: finalOdometerImagePath || null,
            actualDistanceKm,
            tollAmount: parsedToll,
            parkingAmount: parsedParking,
            balancePaymentStatus: PaymentStatus.PAID,
          },
        });

        // 2. Insert Final Balance Payment row
        await tx.payment.create({
          data: {
            bookingId,
            type: PaymentType.BALANCE,
            amount: totalBalanceCollected,
            razorpayPaymentId: `${paymentMethod.toLowerCase()}_pay_${Date.now()}`,
            status: PaymentStatus.PAID,
            verifiedAt: new Date(),
          },
        });

        // 3. Insert TripEvent
        await tx.tripEvent.create({
          data: {
            bookingId,
            type: 'TRIP_COMPLETED',
            payloadJson: {
              driverId: session.driverId,
              startOdometer: startOdo,
              finalOdometer: endOdo,
              actualDistanceKm,
              tollAmount: parsedToll,
              parkingAmount: parsedParking,
              totalBalanceCollected,
              paymentMethod,
              hasFinalImage: !!finalOdometerImagePath,
              timestamp: new Date().toISOString(),
            },
          },
        });

        // 4. Insert AuditLog
        await tx.auditLog.create({
          data: {
            actorUserId: session.userId,
            action: 'DRIVER_COMPLETE_TRIP',
            entityType: 'Booking',
            entityId: bookingId,
            reason: `Trip completed by driver. Odometer: ${startOdo} -> ${endOdo} (${actualDistanceKm} km). Balance collected: ₹${totalBalanceCollected} via ${paymentMethod}`,
          },
        });

        return completedBooking;
      },
      {
        maxWait: 5000,
        timeout: 15000,
      }
    );

    // Realtime SSE: Notify customer and driver
    RealtimeEvents.emitToBooking(bookingId, 'BOOKING_STATUS', {
      bookingId,
      status: BookingStatus.TRIP_COMPLETED,
      actualDistanceKm,
      totalBalanceCollected,
    });

    RealtimeEvents.emitToDriver(session.driverId, 'TRIP_STATUS', {
      bookingId,
      status: BookingStatus.TRIP_COMPLETED,
    });

    const res = NextResponse.json(
      {
        success: true,
        message: 'Trip completed and balance settlement recorded!',
        actualDistanceKm,
        totalBalanceCollected,
        booking: updated,
      },
      { status: 200 }
    );
    return setCorsHeaders(res);
  } catch (error: any) {
    console.error('Error in POST /api/driver/trip/complete:', error);
    const res = NextResponse.json(
      { success: false, message: error.message || 'Failed to complete trip' },
      { status: 500 }
    );
    return setCorsHeaders(res);
  }
}
