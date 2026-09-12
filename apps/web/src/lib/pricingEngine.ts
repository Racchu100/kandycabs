import { TripType, VehicleCategory } from '@kandycabs/shared';
import { FuelType, PricingRule, BookingPriceSnapshot } from './pricingTypes';
import { pricingRepository } from './pricingRepository';

export interface FareCalculationInput {
  tripType: TripType;
  vehicleCategory: VehicleCategory;
  fuelType?: FuelType;
  distanceKm: number;
  durationHours?: number;
  durationDays?: number;
  isNightTrip?: boolean;
  airportRoute?: string;
  couponDiscount?: number;
  ruleOverride?: PricingRule; // Explicit pricing rule override for preview / testing
}

export interface FareCalculationResult {
  isConfigured: boolean;
  pricingRuleId?: string;
  tripType: TripType;
  vehicleCategory: VehicleCategory;
  fuelType: FuelType;
  airportRoute?: string;
  basePrice: number;             // Package Price
  includedKm: number;
  actualDistance: number;
  extraKm: number;
  extraKmRate: number;
  extraKmCharge: number;
  includedHours: number;
  actualHours: number;
  extraHours: number;
  extraHourRate: number;
  extraHourCharge: number;
  tollMode: 'INCLUDED' | 'EXTRA';
  parkingMode: 'INCLUDED' | 'EXTRA';
  nightCharge: number;
  waitingCharge: number;
  driverAllowance: number;
  gstPercent: number;
  gstAmount: number;
  couponDiscount: number;
  subtotal: number;
  finalPrice: number;
  advanceAmount: number;        // 25%
  balanceAmount: number;        // 75%
  inclusions: string[];
  exclusions: string[];
  pricingUpdatedAt: string;
  priceSnapshot: BookingPriceSnapshot;
}

/**
 * Currency rounding helper to guarantee exact 2-decimal precision
 * and prevent floating point errors (e.g. 21.25 * 23 = 488.75).
 */
export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Centralized Fare Calculator.
 * Used identically by:
 * 1. Customer Booking UI (/booking)
 * 2. Admin Pricing Preview Calculator
 * 3. Booking creation API (/api/payments/create-order)
 */
export function calculateFareSync(
  input: FareCalculationInput,
  activeRule?: PricingRule | null
): FareCalculationResult {
  const {
    tripType,
    vehicleCategory,
    fuelType = 'DIESEL',
    distanceKm,
    durationHours = 0,
    durationDays = 1,
    isNightTrip = false,
    airportRoute,
    couponDiscount = 0,
    ruleOverride,
  } = input;

  const rule = ruleOverride || activeRule;
  const now = new Date().toISOString();

  if (!rule || rule.status !== 'ACTIVE') {
    return {
      isConfigured: false,
      pricingRuleId: undefined,
      tripType,
      vehicleCategory,
      fuelType,
      airportRoute,
      basePrice: 0,
      includedKm: 0,
      actualDistance: roundCurrency(Math.max(0, distanceKm)),
      extraKm: 0,
      extraKmRate: 0,
      extraKmCharge: 0,
      includedHours: 0,
      actualHours: 0,
      extraHours: 0,
      extraHourRate: 0,
      extraHourCharge: 0,
      tollMode: 'EXTRA',
      parkingMode: 'EXTRA',
      nightCharge: 0,
      waitingCharge: 0,
      driverAllowance: 0,
      gstPercent: 5,
      gstAmount: 0,
      couponDiscount: 0,
      subtotal: 0,
      finalPrice: 0,
      advanceAmount: 0,
      balanceAmount: 0,
      inclusions: [],
      exclusions: [],
      pricingUpdatedAt: now,
      priceSnapshot: {
        pricingRuleId: 'unconfigured',
        ruleId: 'unconfigured',
        tripType,
        vehicleCategory,
        fuelType,
        airportRoute,
        basePrice: 0,
        includedKm: 0,
        actualDistance: roundCurrency(Math.max(0, distanceKm)),
        extraKm: 0,
        extraKmRate: 0,
        extraKmCharge: 0,
        includedHours: 0,
        actualHours: 0,
        extraHours: 0,
        extraHourRate: 0,
        extraHourCharge: 0,
        tollMode: 'EXTRA',
        parkingMode: 'EXTRA',
        nightCharge: 0,
        waitingCharge: 0,
        driverAllowance: 0,
        gstPercent: 5,
        gstAmount: 0,
        couponDiscount: 0,
        subtotal: 0,
        finalPrice: 0,
        advanceAmount: 0,
        balanceAmount: 0,
        inclusions: [],
        exclusions: [],
        pricingUpdatedAt: now,
        breakdown: {
          basePrice: 0,
          extraKmCharge: 0,
          extraHourCharge: 0,
          driverAllowance: 0,
          nightCharge: 0,
          waitingCharge: 0,
          couponDiscount: 0,
          gstAmount: 0,
          subtotal: 0,
          finalTotal: 0,
          advancePaid: 0,
          balanceDue: 0,
        },
        ratesApplied: {
          includedKm: 0,
          extraKmRate: 0,
          includedHours: 0,
          extraHourRate: 0,
          driverAllowancePerDay: 0,
        },
      },
    };
  }

  const actualDistance = roundCurrency(Math.max(0, distanceKm));
  const includedKm = rule.includedKm || 0;
  const extraKmRate = rule.extraKmPrice || 0;

  let extraKm = 0;
  let extraKmCharge = 0;

  if (actualDistance > includedKm) {
    extraKm = roundCurrency(actualDistance - includedKm);
    extraKmCharge = roundCurrency(extraKm * extraKmRate);
  }

  // Local Hours calculations
  const includedHours = rule.includedHours || 0;
  const actualHours = roundCurrency(Math.max(0, durationHours));
  const extraHourRate = rule.extraHourPrice || 0;

  let extraHours = 0;
  let extraHourCharge = 0;

  if (tripType === TripType.LOCAL && actualHours > includedHours) {
    extraHours = roundCurrency(actualHours - includedHours);
    extraHourCharge = roundCurrency(extraHours * extraHourRate);
  }

  const basePrice = roundCurrency(rule.basePrice || 0);
  const driverAllowance = roundCurrency(
    (rule.driverAllowancePerDay || 0) * Math.max(1, durationDays)
  );
  const nightCharge = isNightTrip ? roundCurrency(rule.nightCharge || 0) : 0;
  const waitingCharge = 0;

  const subtotalBeforeDiscount = roundCurrency(
    basePrice + extraKmCharge + extraHourCharge + driverAllowance + nightCharge + waitingCharge
  );

  const appliedDiscount = roundCurrency(Math.min(subtotalBeforeDiscount, Math.max(0, couponDiscount)));
  const subtotal = roundCurrency(subtotalBeforeDiscount - appliedDiscount);

  const gstPercent = rule.gstPercent !== undefined ? rule.gstPercent : 5;
  const gstAmount = roundCurrency((subtotal * gstPercent) / 100);

  const finalPrice = roundCurrency(subtotal + gstAmount);
  const advanceAmount = roundCurrency(finalPrice * 0.25);
  const balanceAmount = roundCurrency(finalPrice - advanceAmount);

  const inclusions = Array.isArray(rule.inclusions)
    ? rule.inclusions
    : typeof rule.inclusions === 'string'
    ? (rule.inclusions as string).split('\n').filter(Boolean)
    : ['Driver Allowance Included', 'Base Fare and Fuel Charges', 'AC Cab'];

  const exclusions = Array.isArray(rule.exclusions)
    ? rule.exclusions
    : typeof rule.exclusions === 'string'
    ? (rule.exclusions as string).split('\n').filter(Boolean)
    : ['Tolls & Parking extra at actuals'];

  const priceSnapshot: BookingPriceSnapshot = {
    pricingRuleId: rule.id || 'custom',
    ruleId: rule.id || 'custom',
    tripType,
    vehicleCategory,
    fuelType,
    airportRoute: airportRoute || rule.airportRoute,
    basePrice,
    includedKm,
    actualDistance,
    extraKm,
    extraKmRate,
    extraKmCharge,
    includedHours,
    actualHours,
    extraHours,
    extraHourRate,
    extraHourCharge,
    tollMode: rule.tollMode || 'EXTRA',
    parkingMode: rule.parkingMode || 'EXTRA',
    nightCharge,
    waitingCharge,
    driverAllowance,
    gstPercent,
    gstAmount,
    couponDiscount: appliedDiscount,
    subtotal,
    finalPrice,
    advanceAmount,
    balanceAmount,
    inclusions,
    exclusions,
    pricingUpdatedAt: rule.updatedAt || now,
    breakdown: {
      basePrice,
      extraKmCharge,
      extraHourCharge,
      driverAllowance,
      nightCharge,
      waitingCharge,
      couponDiscount: appliedDiscount,
      gstAmount,
      subtotal,
      finalTotal: finalPrice,
      advancePaid: advanceAmount,
      balanceDue: balanceAmount,
    },
    ratesApplied: {
      includedKm,
      extraKmRate,
      includedHours,
      extraHourRate,
      driverAllowancePerDay: rule.driverAllowancePerDay || 0,
    },
  };

  return {
    isConfigured: true,
    pricingRuleId: rule.id,
    tripType,
    vehicleCategory,
    fuelType,
    airportRoute,
    basePrice,
    includedKm,
    actualDistance,
    extraKm,
    extraKmRate,
    extraKmCharge,
    includedHours,
    actualHours,
    extraHours,
    extraHourRate,
    extraHourCharge,
    tollMode: rule.tollMode || 'EXTRA',
    parkingMode: rule.parkingMode || 'EXTRA',
    nightCharge,
    waitingCharge,
    driverAllowance,
    gstPercent,
    gstAmount,
    couponDiscount: appliedDiscount,
    subtotal,
    finalPrice,
    advanceAmount,
    balanceAmount,
    inclusions,
    exclusions,
    pricingUpdatedAt: rule.updatedAt || now,
    priceSnapshot,
  };
}

/**
 * Async wrapper that fetches the active pricing rule from repository first.
 */
export async function calculateFare(input: FareCalculationInput): Promise<FareCalculationResult> {
  const activeRule = await pricingRepository.findActiveRule(
    input.tripType,
    input.vehicleCategory,
    input.fuelType || 'DIESEL',
    input.airportRoute
  );

  return calculateFareSync(input, activeRule);
}
