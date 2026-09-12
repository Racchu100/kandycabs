import { NextResponse } from 'next/server';
import { pricingRepository } from '@/lib/pricingRepository';
import { TripType, VehicleCategory } from '@kandycabs/shared';

export const dynamic = 'force-dynamic';

export interface FareChartRow {
  categoryKey: string;
  vehicleCategory: string;
  seating: string;
  oneWayRate: string;
  oneWayNumeric: number;
  roundTripRate: string;
  roundTripNumeric: number;
  minKmDay: string;
  driverAllowance: string;
  nightAllowance: string;
}

const DEFAULT_ROWS: Record<string, { name: string; seating: string; owRate: number; rtRate: number; minKm: number; driverAllowance: string; nightAllowance: string }> = {
  HATCHBACK: {
    name: 'Hatchback (WagonR / Indica)',
    seating: '4 Seats',
    owRate: 11.5,
    rtRate: 11.0,
    minKm: 250,
    driverAllowance: 'Included',
    nightAllowance: '₹250',
  },
  SEDAN: {
    name: 'Sedan (Swift Dzire / Etios)',
    seating: '4 Seats',
    owRate: 13.5,
    rtRate: 13.0,
    minKm: 250,
    driverAllowance: 'Included',
    nightAllowance: '₹250',
  },
  SUV: {
    name: 'SUV (Ertiga / Marazzo)',
    seating: '6 Seats',
    owRate: 17.5,
    rtRate: 17.0,
    minKm: 250,
    driverAllowance: 'Included',
    nightAllowance: '₹300',
  },
  SUV_PREMIUM: {
    name: 'SUV Premium (Innova Crysta)',
    seating: '7 Seats',
    owRate: 21.0,
    rtRate: 20.0,
    minKm: 250,
    driverAllowance: 'Included',
    nightAllowance: '₹350',
  },
  TEMPO_TRAVELER: {
    name: 'Tempo Traveler Luxury',
    seating: '12 Seats',
    owRate: 26.0,
    rtRate: 25.0,
    minKm: 300,
    driverAllowance: 'Included',
    nightAllowance: '₹400',
  },
};

export async function GET() {
  try {
    const activeRules = await pricingRepository.getActiveRules();

    const categories = ['HATCHBACK', 'SEDAN', 'SUV', 'SUV_PREMIUM', 'TEMPO_TRAVELER'] as const;

    const rows: FareChartRow[] = categories.map((cat) => {
      const defaultInfo = DEFAULT_ROWS[cat];

      // Find active ONEWAY rule for this category
      const owRule = activeRules.find(
        (r) => r.tripType === TripType.ONEWAY && r.vehicleCategory === (cat as VehicleCategory)
      );
      // Find active ROUND rule for this category
      const rtRule = activeRules.find(
        (r) => r.tripType === TripType.ROUND && r.vehicleCategory === (cat as VehicleCategory)
      );

      const oneWayPrice = owRule?.extraKmPrice !== undefined ? owRule.extraKmPrice : defaultInfo.owRate;
      const roundTripPrice = rtRule?.extraKmPrice !== undefined ? rtRule.extraKmPrice : defaultInfo.rtRate;

      const minKm = owRule?.includedKm || rtRule?.includedKm || defaultInfo.minKm;
      const driverAllow = owRule?.driverAllowancePerDay || rtRule?.driverAllowancePerDay;
      const driverAllowanceText = driverAllow ? `₹${driverAllow}` : defaultInfo.driverAllowance;
      const nightAllow = owRule?.nightCharge || rtRule?.nightCharge;
      const nightAllowanceText = nightAllow ? `₹${nightAllow}` : defaultInfo.nightAllowance;

      return {
        categoryKey: cat,
        vehicleCategory: defaultInfo.name,
        seating: defaultInfo.seating,
        oneWayRate: `₹${oneWayPrice.toFixed(1)} / km`,
        oneWayNumeric: oneWayPrice,
        roundTripRate: `₹${roundTripPrice.toFixed(1)} / km`,
        roundTripNumeric: roundTripPrice,
        minKmDay: `${minKm} km`,
        driverAllowance: driverAllowanceText,
        nightAllowance: nightAllowanceText,
      };
    });

    return NextResponse.json({ rows, activeRules });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch fare chart' }, { status: 400 });
  }
}
