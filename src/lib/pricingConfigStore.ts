export interface AdminPricingRule {
  id: string;
  vehicleCategory: string; // 'sedan', 'suv', 'innova', 'tempo'
  tripMode: string; // 'ONEWAY', 'ROUND', 'AIRPORT_PICKUP', 'AIRPORT_DROP', 'LOCAL', 'TOUR'
  ratePerKm: number;
  minKm: number;
  minFare: number;
  driverAllowancePerDay: number;
  driverNightAllowance: number;
  airportSurcharge: number;
  gstRatePercent: number; // e.g. 5
  waitingChargePerHour: number;
  advancePaymentPercent: number; // e.g. 25 (%)
  tollInclusive: boolean; // default false
}

const DEFAULT_PRICING_RULES: Record<string, AdminPricingRule> = {
  'sedan_ONEWAY': {
    id: 'pr_sedan_oneway',
    vehicleCategory: 'sedan',
    tripMode: 'ONEWAY',
    ratePerKm: 14,
    minKm: 50,
    minFare: 700,
    driverAllowancePerDay: 400,
    driverNightAllowance: 250,
    airportSurcharge: 0,
    gstRatePercent: 5,
    waitingChargePerHour: 150,
    advancePaymentPercent: 25,
    tollInclusive: false,
  },
  'sedan_ROUND': {
    id: 'pr_sedan_round',
    vehicleCategory: 'sedan',
    tripMode: 'ROUND',
    ratePerKm: 13,
    minKm: 150,
    minFare: 1950,
    driverAllowancePerDay: 400,
    driverNightAllowance: 250,
    airportSurcharge: 0,
    gstRatePercent: 5,
    waitingChargePerHour: 150,
    advancePaymentPercent: 25,
    tollInclusive: false,
  },
  'suv_ONEWAY': {
    id: 'pr_suv_oneway',
    vehicleCategory: 'suv',
    tripMode: 'ONEWAY',
    ratePerKm: 18,
    minKm: 50,
    minFare: 900,
    driverAllowancePerDay: 500,
    driverNightAllowance: 250,
    airportSurcharge: 0,
    gstRatePercent: 5,
    waitingChargePerHour: 200,
    advancePaymentPercent: 25,
    tollInclusive: false,
  },
  'innova_ONEWAY': {
    id: 'pr_innova_oneway',
    vehicleCategory: 'innova',
    tripMode: 'ONEWAY',
    ratePerKm: 23,
    minKm: 60,
    minFare: 1380,
    driverAllowancePerDay: 500,
    driverNightAllowance: 300,
    airportSurcharge: 0,
    gstRatePercent: 5,
    waitingChargePerHour: 250,
    advancePaymentPercent: 25,
    tollInclusive: false,
  },
  'tempo_ONEWAY': {
    id: 'pr_tempo_oneway',
    vehicleCategory: 'tempo',
    tripMode: 'ONEWAY',
    ratePerKm: 30,
    minKm: 100,
    minFare: 3000,
    driverAllowancePerDay: 600,
    driverNightAllowance: 350,
    airportSurcharge: 0,
    gstRatePercent: 5,
    waitingChargePerHour: 300,
    advancePaymentPercent: 25,
    tollInclusive: false,
  },
  'sedan_AIRPORT_PICKUP': {
    id: 'pr_sedan_airport_pickup',
    vehicleCategory: 'sedan',
    tripMode: 'AIRPORT_PICKUP',
    ratePerKm: 15,
    minKm: 30,
    minFare: 800,
    driverAllowancePerDay: 0,
    driverNightAllowance: 150,
    airportSurcharge: 200, // Airport entry & parking fee
    gstRatePercent: 5,
    waitingChargePerHour: 150,
    advancePaymentPercent: 25,
    tollInclusive: false,
  },
};

const activeConfigStore = new Map<string, AdminPricingRule>(
  Object.entries(DEFAULT_PRICING_RULES)
);

export function getActivePricingRule(vehicleCategory: string, tripMode: string): AdminPricingRule {
  const normalizedCat = vehicleCategory.toLowerCase().includes('suv')
    ? 'suv'
    : vehicleCategory.toLowerCase().includes('innova')
    ? 'innova'
    : vehicleCategory.toLowerCase().includes('tempo')
    ? 'tempo'
    : 'sedan';

  const normalizedMode = tripMode.toUpperCase();
  const key = `${normalizedCat}_${normalizedMode}`;

  const rule = activeConfigStore.get(key);
  if (rule) return rule;

  // Fallback rule if specific combination key is not present
  return {
    id: `pr_fallback_${key}`,
    vehicleCategory: normalizedCat,
    tripMode: normalizedMode,
    ratePerKm: normalizedCat === 'tempo' ? 30 : normalizedCat === 'innova' ? 23 : normalizedCat === 'suv' ? 18 : 14,
    minKm: 50,
    minFare: 700,
    driverAllowancePerDay: 400,
    driverNightAllowance: 250,
    airportSurcharge: normalizedMode.includes('AIRPORT') ? 200 : 0,
    gstRatePercent: 5,
    waitingChargePerHour: 150,
    advancePaymentPercent: 25,
    tollInclusive: false,
  };
}

export function updateAdminPricingRule(rule: AdminPricingRule): void {
  const key = `${rule.vehicleCategory.toLowerCase()}_${rule.tripMode.toUpperCase()}`;
  activeConfigStore.set(key, rule);
}

export function getAllAdminPricingRules(): AdminPricingRule[] {
  return Array.from(activeConfigStore.values());
}
