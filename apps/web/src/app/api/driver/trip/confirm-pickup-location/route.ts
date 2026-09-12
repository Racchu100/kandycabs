import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateConfirmedPickupLocation } from '@/lib/bookingStore';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bookingId, lat, lng, latitude, longitude } = body;

    const latVal = Number(latitude ?? lat);
    const lngVal = Number(longitude ?? lng);

    if (!bookingId || isNaN(latVal) || isNaN(lngVal)) {
      return NextResponse.json(
        { error: 'Valid bookingId, latitude and longitude required' },
        { status: 400 }
      );
    }

    // Store confirmed coordinates in bookingStore
    const updated = updateConfirmedPickupLocation(bookingId, latVal, lngVal);

    return NextResponse.json({
      success: true,
      confirmedPickupLat: latVal,
      confirmedPickupLng: lngVal,
      confirmedPickupAt: new Date().toISOString(),
      updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to confirm customer location' },
      { status: 400 }
    );
  }
}
