import { NextResponse } from 'next/server';
import { recordTripGpsPoint } from '@/lib/bookingStore';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bookingId, phone, lat, lng, latitude, longitude, speedKmh, accuracy, locationName, location } = body;

    const latVal = Number(latitude ?? lat);
    const lngVal = Number(longitude ?? lng);
    const accVal = Number(accuracy) || 8;
    const locNameVal = locationName || location || undefined;
    const targetId = bookingId || phone || 'd_1';

    if (isNaN(latVal) || isNaN(lngVal)) {
      return NextResponse.json({ error: 'Valid latitude and longitude required' }, { status: 400 });
    }

    recordTripGpsPoint(targetId, latVal, lngVal, speedKmh ? Number(speedKmh) : 0, accVal, locNameVal);

    return NextResponse.json({
      success: true,
      recordedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'GPS update failed' }, { status: 400 });
  }
}
