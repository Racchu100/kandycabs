import { VehicleCategory, FuelType, TripType } from '../types';
import {
  VehicleRateConfig,
  PricingCalculationInput,
  PricingBreakdown,
} from './types';

export const VEHICLE_RATES: Record<VehicleCategory, VehicleRateConfig> = {
  [VehicleCategory.HATCHBACK]: {
    category: VehicleCategory.HATCHBACK,
    name: 'Hatchback',
    description: 'WagonR, Swift, Tiago or equivalent',
    seats: 4,
    luggage: 2,
    perKmRate: {
      [FuelType.CNG]: 11.0,
      [FuelType.PETROL]: 12.0,
      [FuelType.DIESEL]: 13.0,
    },
    extraKmRate: 13.0,
    driverAllowancePerDay: 300.0,
    nightCharge: 250.0,
    minRoundTripKmPerDay: 250,
    localPackages: [
      { hours: 4, km: 40, basePrice: 1000 },
      { hours: 8, km: 80, basePrice: 1800 },
    ],
  },
  [VehicleCategory.SEDAN]: {
    category: VehicleCategory.SEDAN,
    name: 'Sedan',
    description: 'Dzire, Etios, Amaze or equivalent',
    seats: 4,
    luggage: 3,
    perKmRate: {
      [FuelType.CNG]: 13.0,
      [FuelType.PETROL]: 14.0,
      [FuelType.DIESEL]: 15.0,
    },
    extraKmRate: 15.0,
    driverAllowancePerDay: 350.0,
    nightCharge: 250.0,
    minRoundTripKmPerDay: 250,
    localPackages: [
      { hours: 4, km: 40, basePrice: 1200 },
      { hours: 8, km: 80, basePrice: 2200 },
    ],
  },
  [VehicleCategory.SUV]: {
    category: VehicleCategory.SUV,
    name: 'SUV (6+1)',
    description: 'Ertiga, Triber, Marazzo or equivalent',
    seats: 6,
    luggage: 4,
    perKmRate: {
      [FuelType.CNG]: 16.0,
      [FuelType.PETROL]: 17.0,
      [FuelType.DIESEL]: 18.0,
    },
    extraKmRate: 19.0,
    driverAllowancePerDay: 400.0,
    nightCharge: 300.0,
    minRoundTripKmPerDay: 250,
    localPackages: [
      { hours: 4, km: 40, basePrice: 1600 },
      { hours: 8, km: 80, basePrice: 2800 },
    ],
  },
  [VehicleCategory.SUV_PREMIUM]: {
    category: VehicleCategory.SUV_PREMIUM,
    name: 'SUV Premium (7+1)',
    description: 'Innova Crysta, Safari or equivalent',
    seats: 7,
    luggage: 5,
    perKmRate: {
      [FuelType.CNG]: 22.0,
      [FuelType.PETROL]: 23.0,
      [FuelType.DIESEL]: 24.0,
    },
    extraKmRate: 25.0,
    driverAllowancePerDay: 500.0,
    nightCharge: 350.0,
    minRoundTripKmPerDay: 250,
    localPackages: [
      { hours: 4, km: 40, basePrice: 2200 },
      { hours: 8, km: 80, basePrice: 3800 },
    ],
  },
  [VehicleCategory.TEMPO_TRAVELER]: {
    category: VehicleCategory.TEMPO_TRAVELER,
    name: 'Tempo Traveler (12+1)',
    description: 'Force Traveller luxury group carrier',
    seats: 12,
    luggage: 10,
    perKmRate: {
      [FuelType.CNG]: 28.0,
      [FuelType.PETROL]: 29.0,
      [FuelType.DIESEL]: 30.0,
    },
    extraKmRate: 32.0,
    driverAllowancePerDay: 600.0,
    nightCharge: 500.0,
    minRoundTripKmPerDay: 300,
    localPackages: [
      { hours: 4, km: 40, basePrice: 3000 },
      { hours: 8, km: 80, basePrice: 5500 },
    ],
  },
};

/**
 * Checks if a given timestamp falls in the night window (default 10:00 PM to 6:00 AM)
 */
export function isNightTimeWindow(
  date: Date | string,
  startHour: number = 22,
  endHour: number = 6
): boolean {
  const d = new Date(date);
  const hours = d.getHours();
  if (startHour > endHour) {
    return hours >= startHour || hours < endHour;
  }
  return hours >= startHour && hours < endHour;
}

/**
 * Server-authoritative pure pricing function.
 * Calculates exact fare, night charge, taxes, advance (25%), and balance (75%).
 */
export function calculateFare(input: PricingCalculationInput): PricingBreakdown {
  const {
    category,
    tripType,
    distanceKm,
    scheduledAt,
    durationDays = 1,
    couponCode,
    overrides,
  } = input;

  const config = VEHICLE_RATES[category] || VEHICLE_RATES[VehicleCategory.SEDAN];
  const fuelType = input.fuelType || (category === VehicleCategory.HATCHBACK ? FuelType.PETROL : FuelType.DIESEL);
  
  const ratePerKm = overrides?.ratePerKm !== undefined ? overrides.ratePerKm : (config.perKmRate[fuelType] || config.perKmRate[FuelType.DIESEL] || 14.0);
  const extraKmRate = overrides?.extraKmRate !== undefined ? overrides.extraKmRate : config.extraKmRate;
  const driverAllowancePerDay = overrides?.driverAllowance !== undefined ? overrides.driverAllowance : config.driverAllowancePerDay;
  const nightChargeAmount = overrides?.nightCharge !== undefined ? overrides.nightCharge : config.nightCharge;
  const minRoundTripKmPerDay = overrides?.minRoundTripKmPerDay !== undefined ? overrides.minRoundTripKmPerDay : config.minRoundTripKmPerDay;
  const gstRatePercent = overrides?.gstRatePercent !== undefined ? overrides.gstRatePercent : 5.0;

  const isNight = isNightTimeWindow(
    scheduledAt,
    overrides?.nightWindowStartHour ?? 22,
    overrides?.nightWindowEndHour ?? 6
  );
  const nightCharge = isNight ? nightChargeAmount : 0;

  let billableDistanceKm = distanceKm;
  let baseFare = 0;
  let extraKmCharge = 0;
  let driverAllowance = 0;

  const days = Math.max(1, durationDays);

  switch (tripType) {
    case TripType.ROUND: {
      // Round trip: min km/day rule
      const minRequiredKm = days * minRoundTripKmPerDay;
      const totalEstimatedKm = distanceKm * 2;
      billableDistanceKm = Math.max(totalEstimatedKm, minRequiredKm);
      baseFare = billableDistanceKm * ratePerKm;
      driverAllowance = days * driverAllowancePerDay;
      break;
    }
    case TripType.ONEWAY: {
      // Minimum 50 km for oneway outstation/city rides
      billableDistanceKm = Math.max(distanceKm, 50);
      baseFare = billableDistanceKm * ratePerKm;
      // Driver allowance for long oneway trips (> 200 km)
      if (billableDistanceKm > 200) {
        driverAllowance = driverAllowancePerDay;
      }
      break;
    }
    case TripType.AIRPORT: {
      // Minimum 35 km for airport transfers
      billableDistanceKm = Math.max(distanceKm, 35);
      baseFare = billableDistanceKm * ratePerKm;
      break;
    }
    case TripType.LOCAL:
    case TripType.PACKAGE: {
      const is4Hr = (input.packageHours || 8) <= 4;
      const pkgKm = is4Hr ? 40 : 80;
      const defaultPkg = config.localPackages?.find((p) => p.hours === (input.packageHours || 8)) ||
        (is4Hr ? { hours: 4, km: 40, basePrice: 1200 } : { hours: 8, km: 80, basePrice: 2200 });

      const basePrice = is4Hr
        ? (overrides?.localPackage4hrBase !== undefined ? overrides.localPackage4hrBase : defaultPkg.basePrice)
        : (overrides?.localPackage8hrBase !== undefined ? overrides.localPackage8hrBase : defaultPkg.basePrice);

      baseFare = basePrice;
      billableDistanceKm = Math.max(distanceKm, pkgKm);
      if (distanceKm > pkgKm) {
        extraKmCharge = (distanceKm - pkgKm) * extraKmRate;
      }
      break;
    }
    default: {
      billableDistanceKm = Math.max(distanceKm, 50);
      baseFare = billableDistanceKm * ratePerKm;
    }
  }

  // Pre-tax subtotal
  let subtotal = baseFare + extraKmCharge + driverAllowance + nightCharge;

  // Coupon discount logic
  let discount = 0;
  if (couponCode) {
    const code = couponCode.trim().toUpperCase();
    if (code === 'KANDY10') {
      discount = Math.min(Math.round(subtotal * 0.1), 500); // 10% max ₹500
    } else if (code === 'FIRST50') {
      discount = 50;
    }
  }

  subtotal = Math.max(0, subtotal - discount);

  // Dynamic GST calculation
  const gstAmount = Math.round(subtotal * (gstRatePercent / 100) * 100) / 100;
  const totalFare = Math.round((subtotal + gstAmount) * 100) / 100;

  // 25% Advance, 75% Balance
  const advanceAmount = Math.round(totalFare * 0.25);
  const balanceAmount = Math.round((totalFare - advanceAmount) * 100) / 100;

  return {
    category,
    fuelType,
    tripType,
    billableDistanceKm: Math.round(billableDistanceKm * 10) / 10,
    actualDistanceKm: Math.round(distanceKm * 10) / 10,
    baseFare: Math.round(baseFare * 100) / 100,
    extraKmCharge: Math.round(extraKmCharge * 100) / 100,
    driverAllowance: Math.round(driverAllowance * 100) / 100,
    nightCharge: Math.round(nightCharge * 100) / 100,
    subtotal: Math.round(subtotal * 100) / 100,
    gstAmount,
    discount,
    totalFare,
    advanceAmount,
    balanceAmount,
    isNightTime: isNight,
    ratePerKm,
  };
}
