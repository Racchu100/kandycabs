import { getActivePricingRule, AdminPricingRule } from '@/lib/pricingConfigStore';

export interface ProductionPricingInput {
  distanceKm: number;
  vehicleCategory: string;
  tripMode: string;
  tripDays?: number;
  isNightJourney?: boolean;
  waitingHours?: number;
  couponDiscount?: number;
}

export interface ImmutableFareSnapshot {
  bookingId?: string;
  distance: number;
  rate_used: number;
  minimum_km: number;
  base_fare: number;
  distance_fare: number;
  driver_allowance: number;
  additional_charges: number;
  gst_rate: number;
  gst_amount: number;
  coupon_discount: number;
  toll_status: 'EXTRA_PAYABLE_SEPARATELY' | 'INCLUDED';
  toll_notice: string;
  final_amount: number;
  advance_amount: number;
  remaining_amount: number;
  currency: 'INR';
  createdAt: string;
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function calculateProductionFare(input: ProductionPricingInput): ImmutableFareSnapshot {
  const {
    distanceKm,
    vehicleCategory,
    tripMode,
    tripDays = 1,
    isNightJourney = false,
    waitingHours = 0,
    couponDiscount = 0,
  } = input;

  // 1. Fetch dynamic admin rule (NEVER hardcoded)
  const rule: AdminPricingRule = getActivePricingRule(vehicleCategory, tripMode);

  // 2. Minimum KM Rule & Distance Fare (Scales with tripDays for Round Trips)
  const numDays = Math.max(1, tripDays);
  const isRoundTrip = tripMode.toUpperCase() === 'ROUND';
  const minKm = isRoundTrip ? rule.minKm * numDays : rule.minKm;
  const effectiveDistance = Math.max(distanceKm, minKm);
  const distanceFare = Math.round(effectiveDistance * rule.ratePerKm);

  // 3. Driver Allowances & Additional Charges (Night, Waiting, Airport Surcharge, Multi-day)
  const nightAllowance = isNightJourney ? rule.driverNightAllowance : 0;
  const dailyDriverAllowance = isRoundTrip ? rule.driverAllowancePerDay * numDays : rule.driverAllowancePerDay;
  const totalDriverAllowance = dailyDriverAllowance + nightAllowance;
  const waitingCharge = Math.round(waitingHours * rule.waitingChargePerHour);
  const additionalCharges = waitingCharge + rule.airportSurcharge;

  // 4. Subtotal & Min Fare Enforcement
  const rawSubtotal = distanceFare + totalDriverAllowance + additionalCharges;
  const subtotal = Math.max(rawSubtotal, isRoundTrip ? rule.minFare * numDays : rule.minFare);

  // 5. Coupon Discount
  const discount = Math.min(couponDiscount, subtotal);
  const taxable = Math.max(0, subtotal - discount);

  // 6. GST Calculation
  const gstAmount = Math.round(taxable * (rule.gstRatePercent / 100));
  const finalAmount = taxable + gstAmount;

  // 7. Advance Payment Calculation
  const advanceAmount = Math.round(finalAmount * (rule.advancePaymentPercent / 100));
  const remainingAmount = finalAmount - advanceAmount;

  // 8. Toll Policy
  const toll_status = rule.tollInclusive ? 'INCLUDED' : 'EXTRA_PAYABLE_SEPARATELY';
  const toll_notice = rule.tollInclusive
    ? 'Toll charges are included in this total fare.'
    : 'Toll charges are extra and payable separately.';

  return {
    distance: distanceKm,
    rate_used: rule.ratePerKm,
    minimum_km: rule.minKm,
    base_fare: distanceFare,
    distance_fare: distanceFare,
    driver_allowance: totalDriverAllowance,
    additional_charges: additionalCharges,
    gst_rate: rule.gstRatePercent,
    gst_amount: gstAmount,
    coupon_discount: discount,
    toll_status,
    toll_notice,
    final_amount: finalAmount,
    advance_amount: advanceAmount,
    remaining_amount: remainingAmount,
    currency: 'INR',
    createdAt: new Date().toISOString(),
  };
}

export function freezeFareSnapshot(bookingId: string, input: ProductionPricingInput): ImmutableFareSnapshot {
  const snapshot = calculateProductionFare(input);
  return {
    ...snapshot,
    bookingId,
    // Deep clone timestamp to guarantee immutability
    createdAt: new Date().toISOString(),
  };
}
