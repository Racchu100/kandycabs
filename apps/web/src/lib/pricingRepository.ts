import { TripType, VehicleCategory } from '@kandycabs/shared';
import { PricingRule, FuelType, PricingHistoryLog } from './pricingTypes';

// Initial default pricing rules for out-of-the-box operation
const DEFAULT_PRICING_RULES: PricingRule[] = [
  // 1. ONE WAY RULES
  {
    id: 'rule_ow_sedan_cng',
    tripType: TripType.ONEWAY,
    vehicleCategory: VehicleCategory.SEDAN,
    fuelType: 'CNG',
    includedKm: 57,
    basePrice: 1187,
    extraKmPrice: 21.25,
    tollMode: 'EXTRA',
    parkingMode: 'EXTRA',
    nightCharge: 0,
    waitingChargePerHour: 100,
    driverAllowancePerDay: 350,
    gstPercent: 5,
    inclusions: ['Driver Allowance', 'Base Fare and Fuel Charges', 'State Tax & Toll - ₹ 50', 'Only One Pickup and Drop', 'GST (5%)', '1 bags', 'AC'],
    exclusions: ['Beyond package km charged at ₹21.25/km after 57 km', 'Toll & Parking charges extra at actuals'],
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule_ow_sedan_diesel',
    tripType: TripType.ONEWAY,
    vehicleCategory: VehicleCategory.SEDAN,
    fuelType: 'DIESEL',
    includedKm: 57,
    basePrice: 1219,
    extraKmPrice: 21.25,
    tollMode: 'EXTRA',
    parkingMode: 'EXTRA',
    nightCharge: 0,
    waitingChargePerHour: 100,
    driverAllowancePerDay: 350,
    gstPercent: 5,
    inclusions: ['Driver Allowance Included', 'Base Fare & Diesel Charges', 'GST (5%)', 'AC Cab'],
    exclusions: ['Tolls & Parking extra at actuals', 'Extra km after 57 km @ ₹21.25/km'],
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule_ow_hatchback_cng',
    tripType: TripType.ONEWAY,
    vehicleCategory: VehicleCategory.HATCHBACK,
    fuelType: 'CNG',
    includedKm: 50,
    basePrice: 999,
    extraKmPrice: 18.5,
    tollMode: 'EXTRA',
    parkingMode: 'EXTRA',
    nightCharge: 0,
    waitingChargePerHour: 100,
    driverAllowancePerDay: 300,
    gstPercent: 5,
    inclusions: ['Driver Allowance Included', 'Base Fuel Charges', 'AC Cab'],
    exclusions: ['Extra km after 50 km @ ₹18.50/km', 'Tolls & Parking extra'],
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule_ow_suv_diesel',
    tripType: TripType.ONEWAY,
    vehicleCategory: VehicleCategory.SUV,
    fuelType: 'DIESEL',
    includedKm: 60,
    basePrice: 1850,
    extraKmPrice: 24.5,
    tollMode: 'EXTRA',
    parkingMode: 'EXTRA',
    nightCharge: 0,
    waitingChargePerHour: 150,
    driverAllowancePerDay: 400,
    gstPercent: 5,
    inclusions: ['6 Seater AC SUV', 'Driver Allowance Included', 'GST (5%)'],
    exclusions: ['Extra km after 60 km @ ₹24.50/km', 'Tolls & Parking extra'],
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule_ow_suv_premium_diesel',
    tripType: TripType.ONEWAY,
    vehicleCategory: VehicleCategory.SUV_PREMIUM,
    fuelType: 'DIESEL',
    includedKm: 70,
    basePrice: 2499,
    extraKmPrice: 28.0,
    tollMode: 'EXTRA',
    parkingMode: 'EXTRA',
    nightCharge: 0,
    waitingChargePerHour: 200,
    driverAllowancePerDay: 500,
    gstPercent: 5,
    inclusions: ['Toyota Innova Crysta 7 Seater', 'Driver Allowance Included', 'AC Luxury Interior'],
    exclusions: ['Extra km after 70 km @ ₹28.00/km', 'Tolls & Parking extra'],
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule_ow_tempo_diesel',
    tripType: TripType.ONEWAY,
    vehicleCategory: VehicleCategory.TEMPO_TRAVELER,
    fuelType: 'DIESEL',
    includedKm: 80,
    basePrice: 3499,
    extraKmPrice: 32.0,
    tollMode: 'EXTRA',
    parkingMode: 'EXTRA',
    nightCharge: 0,
    waitingChargePerHour: 250,
    driverAllowancePerDay: 600,
    gstPercent: 5,
    inclusions: ['12 Seater Luxury Tempo Traveller', 'Driver Allowance Included'],
    exclusions: ['Extra km after 80 km @ ₹32.00/km', 'Tolls & Parking extra'],
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 2. ROUND TRIP RULES
  {
    id: 'rule_rt_sedan_diesel',
    tripType: TripType.ROUND,
    vehicleCategory: VehicleCategory.SEDAN,
    fuelType: 'DIESEL',
    includedKm: 405,
    basePrice: 4955,
    extraKmPrice: 13.5,
    tollMode: 'EXTRA',
    parkingMode: 'EXTRA',
    nightCharge: 0,
    waitingChargePerHour: 100,
    driverAllowancePerDay: 350,
    gstPercent: 5,
    inclusions: ['Driver Allowance Included', 'Multi-stop Route Coverage', 'Base Fuel Charges'],
    exclusions: ['Extra km after 405 km @ ₹13.50/km', 'State permit & Tolls extra'],
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule_rt_suv_diesel',
    tripType: TripType.ROUND,
    vehicleCategory: VehicleCategory.SUV,
    fuelType: 'DIESEL',
    includedKm: 450,
    basePrice: 6500,
    extraKmPrice: 17.5,
    tollMode: 'EXTRA',
    parkingMode: 'EXTRA',
    nightCharge: 0,
    waitingChargePerHour: 150,
    driverAllowancePerDay: 400,
    gstPercent: 5,
    inclusions: ['6 Seater SUV', 'Multi-leg Round Trip', 'Driver Allowance Included'],
    exclusions: ['Extra km after 450 km @ ₹17.50/km', 'Tolls & Permits extra'],
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 3. LOCAL RULES
  {
    id: 'rule_local_sedan_8hr80km',
    tripType: TripType.LOCAL,
    vehicleCategory: VehicleCategory.SEDAN,
    fuelType: 'DIESEL',
    includedKm: 80,
    includedHours: 8,
    basePrice: 2200,
    extraKmPrice: 14.0,
    extraHourPrice: 150,
    tollMode: 'INCLUDED',
    parkingMode: 'EXTRA',
    nightCharge: 0,
    waitingChargePerHour: 100,
    driverAllowancePerDay: 250,
    gstPercent: 5,
    inclusions: ['8 Hours / 80 KM Included', 'Driver Allowance', 'Local City Travel'],
    exclusions: ['Extra km @ ₹14/km after 80 km', 'Extra hour @ ₹150/hr after 8 hrs', 'Parking extra'],
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule_local_sedan_4hr40km',
    tripType: TripType.LOCAL,
    vehicleCategory: VehicleCategory.SEDAN,
    fuelType: 'DIESEL',
    includedKm: 40,
    includedHours: 4,
    basePrice: 1746,
    extraKmPrice: 14.0,
    extraHourPrice: 150,
    tollMode: 'INCLUDED',
    parkingMode: 'EXTRA',
    nightCharge: 0,
    waitingChargePerHour: 100,
    driverAllowancePerDay: 250,
    gstPercent: 5,
    inclusions: ['4 Hours / 40 KM Included', 'Driver Allowance', 'City Limits Coverage'],
    exclusions: ['Extra km @ ₹14/km after 40 km', 'Extra hour @ ₹150/hr after 4 hrs'],
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule_local_suv_8hr80km',
    tripType: TripType.LOCAL,
    vehicleCategory: VehicleCategory.SUV,
    fuelType: 'DIESEL',
    includedKm: 80,
    includedHours: 8,
    basePrice: 3200,
    extraKmPrice: 18.0,
    extraHourPrice: 200,
    tollMode: 'INCLUDED',
    parkingMode: 'EXTRA',
    nightCharge: 0,
    waitingChargePerHour: 150,
    driverAllowancePerDay: 300,
    gstPercent: 5,
    inclusions: ['8 Hours / 80 KM Included', '6 Seater AC SUV', 'Driver Allowance'],
    exclusions: ['Extra km @ ₹18/km after 80 km', 'Extra hour @ ₹200/hr after 8 hrs'],
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 4. AIRPORT TRANSFER RULES
  {
    id: 'rule_airport_city_sedan',
    tripType: TripType.AIRPORT,
    vehicleCategory: VehicleCategory.SEDAN,
    fuelType: 'DIESEL',
    airportRoute: 'Mangalore Airport ➔ City Center',
    includedKm: 30,
    basePrice: 1200,
    extraKmPrice: 18.0,
    tollMode: 'INCLUDED',
    parkingMode: 'EXTRA',
    nightCharge: 150,
    waitingChargePerHour: 100,
    driverAllowancePerDay: 0, // Included in airport flat fare
    gstPercent: 5,
    inclusions: ['Airport Terminal Pickup', 'Toll Charges Included', 'Meet & Greet Service', 'Luggage Assistance'],
    exclusions: ['Airport Parking @ actuals', 'Extra km after 30 km @ ₹18/km'],
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const globalForPricing = globalThis as unknown as {
  pricingRulesStore: PricingRule[] | undefined;
  pricingHistoryStore: PricingHistoryLog[] | undefined;
};

if (!globalForPricing.pricingRulesStore) {
  globalForPricing.pricingRulesStore = [...DEFAULT_PRICING_RULES];
}
if (!globalForPricing.pricingHistoryStore) {
  globalForPricing.pricingHistoryStore = [];
}

let rulesStore = globalForPricing.pricingRulesStore;
let historyStore = globalForPricing.pricingHistoryStore;

/**
 * Storage Abstraction Repository.
 * This clean abstraction enables seamless drop-in replacement with Supabase database queries
 * without modifying UI components or fare calculation logic.
 */
export const pricingRepository = {
  /**
   * Retrieves all pricing rules.
   */
  async getAllRules(): Promise<PricingRule[]> {
    return [...rulesStore];
  },

  /**
   * Retrieves all active pricing rules.
   */
  async getActiveRules(): Promise<PricingRule[]> {
    return rulesStore.filter((r) => r.status === 'ACTIVE');
  },

  /**
   * Finds the best active matching rule for a given trip configuration.
   */
  async findActiveRule(
    tripType: TripType,
    vehicleCategory: VehicleCategory,
    fuelType: FuelType = 'DIESEL',
    airportRoute?: string
  ): Promise<PricingRule | null> {
    const activeRules = await this.getActiveRules();

    // 1. Exact match with airport route if applicable
    if (tripType === TripType.AIRPORT && airportRoute) {
      const match = activeRules.find(
        (r) =>
          r.tripType === TripType.AIRPORT &&
          r.vehicleCategory === vehicleCategory &&
          r.fuelType === fuelType &&
          r.airportRoute?.toLowerCase() === airportRoute.toLowerCase()
      );
      if (match) return match;
    }

    // 2. Exact match on tripType + vehicleCategory + fuelType
    const exactMatch = activeRules.find(
      (r) =>
        r.tripType === tripType &&
        r.vehicleCategory === vehicleCategory &&
        r.fuelType === fuelType
    );
    if (exactMatch) return exactMatch;

    // 3. Fallback match on tripType + vehicleCategory (ignoring fuelType if exact fuel not configured)
    const categoryMatch = activeRules.find(
      (r) => r.tripType === tripType && r.vehicleCategory === vehicleCategory
    );
    if (categoryMatch) return categoryMatch;

    // 4. Fallback match on tripType only
    return activeRules.find((r) => r.tripType === tripType) || null;
  },

  /**
   * Creates a new pricing rule. Enforces strict active rule conflict resolution.
   */
  async createRule(
    ruleData: Omit<PricingRule, 'id' | 'createdAt' | 'updatedAt'>,
    adminId: string = 'admin'
  ): Promise<PricingRule> {
    const now = new Date().toISOString();
    const newId = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    // If new rule is ACTIVE, deactivate any conflicting active rules for the exact same combination
    if (ruleData.status === 'ACTIVE') {
      await this.deactivateConflictingRules(
        ruleData.tripType,
        ruleData.vehicleCategory,
        ruleData.fuelType,
        ruleData.airportRoute,
        newId
      );
    }

    const newRule: PricingRule = {
      ...ruleData,
      id: newId,
      createdAt: now,
      updatedAt: now,
      updatedByAdmin: adminId,
    };

    rulesStore.unshift(newRule);

    historyStore.unshift({
      id: `hist_${Date.now()}`,
      ruleId: newId,
      action: 'CREATE',
      newValues: newRule,
      updatedAt: now,
      updatedByAdmin: adminId,
    });

    return newRule;
  },

  /**
   * Updates an existing pricing rule. Preserves history snapshot.
   */
  async updateRule(
    id: string,
    updates: Partial<PricingRule>,
    adminId: string = 'admin'
  ): Promise<PricingRule | null> {
    const idx = rulesStore.findIndex((r) => r.id === id);
    if (idx === -1) return null;

    const previousRule = { ...rulesStore[idx] };
    const now = new Date().toISOString();

    const mergedStatus = updates.status !== undefined ? updates.status : previousRule.status;
    const mergedTrip = updates.tripType || previousRule.tripType;
    const mergedCategory = updates.vehicleCategory || previousRule.vehicleCategory;
    const mergedFuel = updates.fuelType || previousRule.fuelType;
    const mergedRoute = updates.airportRoute !== undefined ? updates.airportRoute : previousRule.airportRoute;

    // Enforce active rule conflict resolution
    if (mergedStatus === 'ACTIVE') {
      await this.deactivateConflictingRules(
        mergedTrip,
        mergedCategory,
        mergedFuel,
        mergedRoute,
        id
      );
    }

    const updatedRule: PricingRule = {
      ...previousRule,
      ...updates,
      updatedAt: now,
      updatedByAdmin: adminId,
    };

    rulesStore[idx] = updatedRule;

    historyStore.unshift({
      id: `hist_${Date.now()}`,
      ruleId: id,
      action: 'UPDATE',
      previousValues: previousRule,
      newValues: updatedRule,
      updatedAt: now,
      updatedByAdmin: adminId,
    });

    return updatedRule;
  },

  /**
   * Deactivates conflicting active rules for the same combination.
   */
  async deactivateConflictingRules(
    tripType: TripType,
    vehicleCategory: VehicleCategory,
    fuelType: FuelType,
    airportRoute?: string,
    excludeRuleId?: string
  ): Promise<void> {
    const now = new Date().toISOString();
    rulesStore = rulesStore.map((r) => {
      if (r.id === excludeRuleId) return r;

      const isConflict =
        r.status === 'ACTIVE' &&
        r.tripType === tripType &&
        r.vehicleCategory === vehicleCategory &&
        r.fuelType === fuelType &&
        (tripType !== TripType.AIRPORT || r.airportRoute === airportRoute);

      if (isConflict) {
        return {
          ...r,
          status: 'INACTIVE',
          updatedAt: now,
        };
      }
      return r;
    });
  },

  /**
   * Activates or deactivates a pricing rule.
   */
  async setRuleStatus(
    id: string,
    status: 'ACTIVE' | 'INACTIVE',
    adminId: string = 'admin'
  ): Promise<PricingRule | null> {
    return this.updateRule(id, { status }, adminId);
  },

  /**
   * Deletes a pricing rule.
   */
  async deleteRule(id: string, adminId: string = 'admin'): Promise<boolean> {
    const idx = rulesStore.findIndex((r) => r.id === id);
    if (idx === -1) return false;

    const removed = rulesStore[idx];
    rulesStore = rulesStore.filter((r) => r.id !== id);

    historyStore.unshift({
      id: `hist_${Date.now()}`,
      ruleId: id,
      action: 'DELETE',
      previousValues: removed,
      updatedAt: new Date().toISOString(),
      updatedByAdmin: adminId,
    });

    return true;
  },

  /**
   * Duplicates an existing pricing rule as an INACTIVE draft for editing.
   */
  async duplicateRule(id: string, adminId: string = 'admin'): Promise<PricingRule | null> {
    const existing = rulesStore.find((r) => r.id === id);
    if (!existing) return null;

    const { id: oldId, createdAt, updatedAt, ...copyData } = existing;
    const duplicated = await this.createRule(
      {
        ...copyData,
        status: 'INACTIVE',
      },
      adminId
    );

    historyStore.unshift({
      id: `hist_${Date.now()}`,
      ruleId: duplicated.id,
      fleetName: duplicated.vehicleCategory,
      fuelType: duplicated.fuelType,
      tripType: duplicated.tripType,
      action: 'DUPLICATE',
      newValues: duplicated,
      updatedAt: new Date().toISOString(),
      updatedByAdmin: adminId,
    });

    return duplicated;
  },

  /**
   * Retrieves pricing history log.
   */
  async getHistory(): Promise<PricingHistoryLog[]> {
    return [...historyStore];
  },
};
