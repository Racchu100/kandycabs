import { TripType, VehicleCategory } from '@kandycabs/shared';

export type FuelType = 'DIESEL' | 'CNG' | 'PETROL' | 'ELECTRIC';

export interface FleetItem {
  id: string;
  fleetName: string;            // e.g. "Sedan", "SUV", "Innova Crysta"
  displayName: string;          // e.g. "Sedan (Swift Dzire / Etios)"
  description?: string;
  category: VehicleCategory;    // HATCHBACK, SEDAN, SUV, SUV_PREMIUM, TEMPO_TRAVELER
  image?: string;
  passengerCapacity: number;
  luggageCapacity: number;
  enabledFuelTypes: FuelType[]; // e.g. ['CNG', 'DIESEL']
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PricingRule {
  id: string;
  fleetId?: string;               // Optional reference to FleetItem
  tripType: TripType;
  vehicleCategory: VehicleCategory;
  fuelType: FuelType;
  airportRoute?: string;          // e.g., "Airport -> City", "City -> Airport"
  includedKm: number;
  includedHours?: number;         // For Local trips
  basePrice: number;              // Package Price
  extraKmPrice: number;           // ₹/km
  extraHourPrice?: number;        // ₹/hr for local extra hours
  minimumFare?: number;
  tollMode: 'INCLUDED' | 'EXTRA';
  parkingMode: 'INCLUDED' | 'EXTRA';
  nightCharge: number;
  waitingChargePerHour: number;
  driverAllowancePerDay: number;
  gstPercent: number;             // e.g. 5
  inclusions: string[];
  exclusions: string[];
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  updatedByAdmin?: string;
}

export interface BookingPriceSnapshot {
  pricingRuleId?: string;
  ruleId?: string;
  fleetId?: string;
  tripType: TripType;
  vehicleCategory: VehicleCategory;
  fuelType: FuelType;
  airportRoute?: string;
  basePrice: number;
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
  advanceAmount: number; // 25%
  balanceAmount: number; // 75%
  inclusions: string[];
  exclusions: string[];
  pricingUpdatedAt: string;
  breakdown?: any;
  ratesApplied?: any;
}

export interface PricingHistoryLog {
  id: string;
  ruleId: string;
  fleetName?: string;
  fuelType?: FuelType;
  tripType?: TripType;
  action: 'CREATE' | 'UPDATE' | 'ACTIVATE' | 'DEACTIVATE' | 'DELETE' | 'DUPLICATE';
  previousValues?: Partial<PricingRule>;
  newValues?: Partial<PricingRule>;
  updatedAt: string;
  updatedByAdmin?: string;
}
