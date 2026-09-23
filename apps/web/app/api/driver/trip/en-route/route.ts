import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@kandy-cabs/db';
import { getDriverSession } from '@/lib/driver-auth';
import { BookingStatus } from '@kandy-cabs/shared';
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
    const { bookingId } = body;

    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        assignedDriverId: session.driverId,
      },
    });

    if (!booking) {
      const res = NextResponse.json(
        { success: false, message: 'Active booking not found for this driver' },
        { status: 404 }
      );
      return setCorsHeaders(res);
    }

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.DRIVER_EN_ROUTE },
      });

      await tx.tripEvent.create({
        data: {
          bookingId,
          type: 'DRIVER_EN_ROUTE',
          payloadJson: {
            driverId: session.driverId,
            timestamp: new Date().toISOString(),
          },
        },
      });
    });

    // Realtime SSE: Notify customer tracking stream
    RealtimeEvents.emitToBooking(bookingId, 'BOOKING_STATUS', {
      bookingId,
      status: BookingStatus.DRIVER_EN_ROUTE,
    });

    const res = NextResponse.json(
      { success: true, message: 'Status updated to DRIVER_EN_ROUTE' },
      { status: 200 }
    );
    return setCorsHeaders(res);
  } catch (error: any) {
    console.error('Error in POST /api/driver/trip/en-route:', error);
    const res = NextResponse.json(
      { success: false, message: error.message || 'Failed to update status' },
      { status: 500 }
    );
    return setCorsHeaders(res);
  }
}
