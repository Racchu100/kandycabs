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
    const {
      lat,
      lng,
      bookingId,
      batchedPoints = [],
    } = body;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      const res = NextResponse.json(
        { success: false, message: 'Valid lat and lng coordinates required' },
        { status: 400 }
      );
      return setCorsHeaders(res);
    }

    const now = new Date();

    // 1. Update Driver's latest position & ping time (Flow A)
    await prisma.driver.update({
      where: { id: session.driverId },
      data: {
        currentLat: lat,
        currentLng: lng,
        lastPingAt: now,
      },
    });

    // 2. ACTIVE-TRIP tier: Insert TripTracking breadcrumbs if on an active trip
    if (bookingId) {
      const activeBooking = await prisma.booking.findFirst({
        where: {
          id: bookingId,
          assignedDriverId: session.driverId,
          status: { in: [BookingStatus.DRIVER_EN_ROUTE, BookingStatus.TRIP_STARTED] },
        },
      });

      if (activeBooking) {
        const pointsToInsert = [];

        // If batch array provided, insert all batched points
        if (Array.isArray(batchedPoints) && batchedPoints.length > 0) {
          for (const pt of batchedPoints) {
            if (typeof pt.lat === 'number' && typeof pt.lng === 'number') {
              pointsToInsert.push({
                bookingId,
                driverId: session.driverId,
                lat: pt.lat,
                lng: pt.lng,
                recordedAt: pt.recordedAt ? new Date(pt.recordedAt) : now,
              });
            }
          }
        } else {
          pointsToInsert.push({
            bookingId,
            driverId: session.driverId,
            lat,
            lng,
            recordedAt: now,
          });
        }

        if (pointsToInsert.length > 0) {
          await prisma.tripTracking.createMany({
            data: pointsToInsert,
          });

          // Realtime SSE: Stream live coordinates to customer map
          RealtimeEvents.emitToBooking(bookingId, 'DRIVER_LOCATION', {
            bookingId,
            driverId: session.driverId,
            lat,
            lng,
            timestamp: now.getTime(),
          });
        }
      }
    }

    const res = NextResponse.json(
      { success: true, timestamp: now.toISOString() },
      { status: 200 }
    );
    return setCorsHeaders(res);
  } catch (error: any) {
    console.error('Error in POST /api/driver/ping:', error);
    const res = NextResponse.json(
      { success: false, message: error.message || 'Ping failed' },
      { status: 500 }
    );
    return setCorsHeaders(res);
  }
}
