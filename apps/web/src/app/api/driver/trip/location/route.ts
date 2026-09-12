import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recordTripGpsPoint } from '@/lib/bookingStore';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      bookingId,
      driverId,
      lat,
      lng,
      latitude,
      longitude,
      speedKmh,
      speed,
      accuracy,
      heading,
      timestamp,
      locationName,
      location,
      trackingStatus,
    } = body;

    const latVal = Number(latitude ?? lat);
    const lngVal = Number(longitude ?? lng);
    const accVal = Number(accuracy) || 8;
    const locNameVal = locationName || location || undefined;
    const calculatedSpeedKmh = speedKmh !== undefined ? Number(speedKmh) : speed ? Math.round(Number(speed) * 3.6) : 0;

    if (!bookingId || isNaN(latVal) || isNaN(lngVal)) {
      return NextResponse.json({ error: 'Valid bookingId, latitude and longitude required' }, { status: 400 });
    }

    recordTripGpsPoint(bookingId, latVal, lngVal, calculatedSpeedKmh, accVal, locNameVal);

    try {
      const found = await prisma.booking.findFirst({
        where: { OR: [{ id: bookingId }, { humanReadableRef: bookingId }] },
      });

      if (found) {
        await prisma.tripTracking.create({
          data: {
            bookingId: found.id,
            driverId: found.assignedDriverId || driverId || 'd_1',
            latitude: latVal,
            longitude: lngVal,
            speedKmh: speedKmh ? Number(speedKmh) : 0,
            recordedAt: new Date(),
          },
        }).catch(() => {});
      }
    } catch (dbErr) {
      console.warn('[trip/location POST] DB update fallback:', dbErr);
    }

    return NextResponse.json({
      success: true,
      recordedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to record location point' },
      { status: 400 }
    );
  }
}
