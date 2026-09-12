import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStoredBookingById, getTripGpsPoints, getTripAuditLogs } from '@/lib/bookingStore';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;
    let booking = getStoredBookingById(bookingId);

    let dbBooking: any = null;
    let dbTracking: any[] = [];
    let dbEvents: any[] = [];

    try {
      dbBooking = await prisma.booking.findFirst({
        where: { OR: [{ id: bookingId }, { humanReadableRef: bookingId }] },
        include: {
          customer: { include: { user: true } },
          assignedDriver: { include: { user: true } },
          vehicle: true,
        },
      });

      if (dbBooking) {
        dbTracking = await prisma.tripTracking.findMany({
          where: { bookingId: dbBooking.id },
          orderBy: { recordedAt: 'asc' },
        });

        dbEvents = await prisma.tripEvent.findMany({
          where: { bookingId: dbBooking.id },
          orderBy: { createdAt: 'asc' },
        });
      }
    } catch (dbErr) {
      console.warn('[driver/trip/[id] GET] DB lookup fallback:', dbErr);
    }

    const mergedBooking = dbBooking || booking;
    if (!mergedBooking) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    const trackingPoints = dbTracking.length > 0 ? dbTracking : getTripGpsPoints(bookingId);
    const auditLogs = dbEvents.length > 0 ? dbEvents : getTripAuditLogs(bookingId);

    // Merge in-memory live fields on top of DB record so driver polling detects admin approval
    const liveFields = booking
      ? {
          otpStatus: booking.otpStatus,
          status: booking.status || mergedBooking?.status,
          startedBy: booking.startedBy,
          adminId: booking.adminId,
          adminReason: booking.adminReason,
          adminStartedAt: booking.adminStartedAt,
          tripStartedAt: booking.tripStartedAt,
        }
      : {};

    const tripData = { ...mergedBooking, ...liveFields };

    return NextResponse.json({
      success: true,
      trip: tripData,
      booking: tripData,
      trackingPoints,
      auditLogs,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch trip details' },
      { status: 400 }
    );
  }
}
