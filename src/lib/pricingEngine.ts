import { TripMode } from '@/types';

export interface PricingCalculationInput {
  distanceKm: number;
  vehicleCategory: string; // e.g. 'sedan', 'suv', 'tempo'
  tripMode: TripMode;
  isNightJourney?: boolean;
  couponDiscount?: number;
}

export interface FareBreakdown {
  baseFare: number;
  distanceFare: number;
  driverAllowance: number;
  nightAllowance: number;
  subtotal: number;
  discount: number;
  gstAmount: number; // 5% GST
  totalFare: number;
  ratePerKm: number;
}

export function calculateFare(input: PricingCalculationInput): FareBreakdown {
  const { distanceKm, vehicleCategory, tripMode, isNightJourney = false, couponDiscount = 0 } = input;

  let ratePerKm = 14;
  let driverAllowance = 400;
  let baseMinKm = 50;

  if (vehicleCategory.toLowerCase().includes('suv') || vehicleCategory.toLowerCase().includes('ertiga')) {
    ratePerKm = 18;
    driverAllowance = 500;
  } else if (vehicleCategory.toLowerCase().includes('innova')) {
    ratePerKm = 23;
    driverAllowance = 500;
  } else if (vehicleCategory.toLowerCase().includes('tempo')) {
    ratePerKm = 30;
    driverAllowance = 600;
    baseMinKm = 100;
  } else if (vehicleCategory.toLowerCase().includes('etios')) {
    ratePerKm = 15;
  }

  const effectiveKm = Math.max(distanceKm, baseMinKm);
  const distanceFare = Math.round(effectiveKm * ratePerKm);
  const baseFare = Math.round(baseMinKm * ratePerKm);
  const nightAllowance = isNightJourney ? 250 : 0;

  let totalDriverAllowance = driverAllowance;
  if (tripMode === 'round' && distanceKm > 300) {
    totalDriverAllowance = driverAllowance * 2;
  }

  const subtotal = distanceFare + totalDriverAllowance + nightAllowance;
  const discount = Math.min(couponDiscount, subtotal);
  const taxableAmount = Math.max(0, subtotal - discount);
  const gstAmount = Math.round(taxableAmount * 0.05); // 5% GST
  const totalFare = taxableAmount + gstAmount;

  return {
    baseFare,
    distanceFare,
    driverAllowance: totalDriverAllowance,
    nightAllowance,
    subtotal,
    discount,
    gstAmount,
    totalFare,
    ratePerKm,
  };
}
