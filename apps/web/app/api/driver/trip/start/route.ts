import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@kandy-cabs/db';
import { getDriverSession } from '@/lib/driver-auth';
import { BookingStatus, verifyOtp } from '@kandy-cabs/shared';
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
      pickupOtp,
      startingOdometer,
      startingOdometerImagePath,
    } = body;

    if (!bookingId || !pickupOtp) {
      const res = NextResponse.json(
        { success: false, message: 'Booking ID and Pickup OTP are required' },
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

    // If trip was already authorized/started by Admin override
    if (booking.status === BookingStatus.TRIP_STARTED) {
      if (startingOdometer) {
        await prisma.booking.update({
          where: { id: bookingId },
          data: {
            startingOdometer: parseFloat(String(startingOdometer)),
            startingOdometerImagePath: startingOdometerImagePath || null,
          },
        });
      }
      const res = NextResponse.json(
        {
          success: true,
          message: 'Trip authorized by admin. Proceeding to active trip.',
          booking,
        },
        { status: 200 }
      );
      return setCorsHeaders(res);
    }

    // Verify OTP
    const isOtpValid = verifyOtp(pickupOtp.trim(), booking.pickupOtp || '');
    if (!isOtpValid) {
      const res = NextResponse.json(
        { success: false, message: 'Incorrect 4-digit pickup OTP. Please verify with customer or request admin override.' },
        { status: 400 }
      );
      return setCorsHeaders(res);
    }

    // Atomic Transaction: update status, record odometer, clear Flow B customer location
    const updated = await prisma.$transaction(
      async (tx) => {
        const updatedBooking = await tx.booking.update({
          where: { id: bookingId },
          data: {
            status: BookingStatus.TRIP_STARTED,
            startingOdometer: startingOdometer ? parseFloat(String(startingOdometer)) : null,
            startingOdometerImagePath: startingOdometerImagePath || null,
            // Clear Flow B customer pickup coordinates on trip start
            customerCurrentLat: null,
            customerCurrentLng: null,
            customerLocationSharingEnabled: false,
          },
        });

        await tx.tripEvent.create({
          data: {
            bookingId,
            type: 'TRIP_STARTED',
            payloadJson: {
              driverId: session.driverId,
              startingOdometer,
              hasImage: !!startingOdometerImagePath,
              timestamp: new Date().toISOString(),
            },
          },
        });

        await tx.auditLog.create({
          data: {
            actorUserId: session.userId,
            action: 'DRIVER_START_TRIP',
            entityType: 'Booking',
            entityId: bookingId,
            reason: `Driver started trip with verified OTP and starting odometer ${startingOdometer || 'N/A'}`,
          },
        });

        return updatedBooking;
      },
      {
        maxWait: 5000,
        timeout: 15000,
      }
    );

    // Realtime SSE: Notify customer and driver
    RealtimeEvents.emitToBooking(bookingId, 'BOOKING_STATUS', {
      bookingId,
      status: BookingStatus.TRIP_STARTED,
      startingOdometer,
    });

    const res = NextResponse.json(
      {
        success: true,
        message: 'Trip started successfully!',
        booking: updated,
      },
      { status: 200 }
    );
    return setCorsHeaders(res);
  } catch (error: any) {
    console.error('Error in POST /api/driver/trip/start:', error);
    const res = NextResponse.json(
      { success: false, message: error.message || 'Failed to start trip' },
      { status: 500 }
    );
    return setCorsHeaders(res);
  }
}
