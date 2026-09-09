import { NextResponse } from 'next/server';
import { calculateProductionFare, formatINR } from '@/lib/productionPricingEngine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      distanceKm,
      vehicleCategory,
      tripMode,
      isNightJourney = false,
      waitingHours = 0,
      couponDiscount = 0,
    } = body;

    if (typeof distanceKm !== 'number' || !vehicleCategory || !tripMode) {
      return NextResponse.json(
        { error: 'Required parameters: distanceKm (number), vehicleCategory, tripMode' },
        { status: 400 }
      );
    }

    // Authoritative backend pricing calculation (Never trusts price sent from frontend)
    const snapshot = calculateProductionFare({
      distanceKm,
      vehicleCategory,
      tripMode,
      isNightJourney,
      waitingHours,
      couponDiscount,
    });

    return NextResponse.json({
      success: true,
      snapshot,
      formattedTotal: formatINR(snapshot.final_amount),
      formattedAdvance: formatINR(snapshot.advance_amount),
      formattedRemaining: formatINR(snapshot.remaining_amount),
    });
  } catch {
    return NextResponse.json({ error: 'Failed to calculate production fare' }, { status: 500 });
  }
}
