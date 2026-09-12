import { NextResponse } from 'next/server';
import { calculateFare } from '@/lib/pricingEngine';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await calculateFare({
      tripType: body.tripType,
      vehicleCategory: body.vehicleCategory,
      fuelType: body.fuelType || 'DIESEL',
      distanceKm: Number(body.distanceKm || 0),
      durationHours: Number(body.durationHours || 0),
      durationDays: Number(body.durationDays || 1),
      isNightTrip: Boolean(body.isNightTrip),
      airportRoute: body.airportRoute,
      couponDiscount: Number(body.couponDiscount || 0),
    });

    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Fare calculation failed' }, { status: 400 });
  }
}
