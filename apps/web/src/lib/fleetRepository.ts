import { VehicleCategory } from '@kandycabs/shared';
import { FleetItem, FuelType } from './pricingTypes';

// Initial default fleets data
const DEFAULT_FLEETS: FleetItem[] = [
  {
    id: 'fleet_hatchback',
    fleetName: 'Hatchback',
    displayName: 'Hatchback (WagonR / Indica)',
    description: '4 Seater AC Hatchback for budget city and short outstation trips',
    category: VehicleCategory.HATCHBACK,
    image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&auto=format&fit=crop&q=60',
    passengerCapacity: 4,
    luggageCapacity: 2,
    enabledFuelTypes: ['CNG', 'DIESEL', 'PETROL'],
    active: true,
    sortOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'fleet_sedan',
    fleetName: 'Sedan',
    displayName: 'Sedan (Swift Dzire / Etios)',
    description: '4 Seater Comfortable Sedan with AC for business & family travel',
    category: VehicleCategory.SEDAN,
    image: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800&auto=format&fit=crop&q=60',
    passengerCapacity: 4,
    luggageCapacity: 2,
    enabledFuelTypes: ['CNG', 'DIESEL'],
    active: true,
    sortOrder: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'fleet_suv',
    fleetName: 'SUV',
    displayName: 'SUV (Ertiga / XL6)',
    description: '6 Seater Spacious AC SUV for group travel & extra luggage',
    category: VehicleCategory.SUV,
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop&q=60',
    passengerCapacity: 6,
    luggageCapacity: 3,
    enabledFuelTypes: ['DIESEL'],
    active: true,
    sortOrder: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'fleet_suv_premium',
    fleetName: 'SUV Premium',
    displayName: 'SUV Premium (Toyota Innova Crysta)',
    description: '7 Seater Premium Luxury SUV with plush leather seats & climate control',
    category: VehicleCategory.SUV_PREMIUM,
    image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=800&auto=format&fit=crop&q=60',
    passengerCapacity: 7,
    luggageCapacity: 4,
    enabledFuelTypes: ['DIESEL'],
    active: true,
    sortOrder: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'fleet_tempo',
    fleetName: 'Tempo Traveller',
    displayName: 'Tempo Traveller (12 Seater Luxury)',
    description: '12 Seater Luxury Minibus for large pilgrimage & corporate groups',
    category: VehicleCategory.TEMPO_TRAVELER,
    image: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800&auto=format&fit=crop&q=60',
    passengerCapacity: 12,
    luggageCapacity: 8,
    enabledFuelTypes: ['DIESEL'],
    active: true,
    sortOrder: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let fleetStore: FleetItem[] = [...DEFAULT_FLEETS];

/**
 * Fleet Management Storage Abstraction Repository.
 * Clean repository interface compatible with future Supabase PostgreSQL database.
 */
export const fleetRepository = {
  /**
   * Get all fleets.
   */
  async getFleets(): Promise<FleetItem[]> {
    return [...fleetStore].sort((a, b) => a.sortOrder - b.sortOrder);
  },

  /**
   * Get active fleets only.
   */
  async getActiveFleets(): Promise<FleetItem[]> {
    return (await this.getFleets()).filter((f) => f.active);
  },

  /**
   * Get fleet by ID or Category.
   */
  async getFleetById(idOrCategory: string): Promise<FleetItem | null> {
    const fleet = fleetStore.find(
      (f) => f.id === idOrCategory || f.category === idOrCategory || f.fleetName.toLowerCase() === idOrCategory.toLowerCase()
    );
    return fleet || null;
  },

  /**
   * Create a new fleet.
   */
  async createFleet(
    data: Omit<FleetItem, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<FleetItem> {
    const now = new Date().toISOString();
    const newId = `fleet_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    const newFleet: FleetItem = {
      ...data,
      id: newId,
      createdAt: now,
      updatedAt: now,
    };

    fleetStore.push(newFleet);
    return newFleet;
  },

  /**
   * Update an existing fleet.
   */
  async updateFleet(id: string, updates: Partial<FleetItem>): Promise<FleetItem | null> {
    const idx = fleetStore.findIndex((f) => f.id === id);
    if (idx === -1) return null;

    const updated: FleetItem = {
      ...fleetStore[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    fleetStore[idx] = updated;
    return updated;
  },

  /**
   * Delete a fleet.
   */
  async deleteFleet(id: string): Promise<boolean> {
    const initialLength = fleetStore.length;
    fleetStore = fleetStore.filter((f) => f.id !== id);
    return fleetStore.length < initialLength;
  },

  /**
   * Enable or disable a fuel type for a fleet.
   */
  async toggleFuelType(
    fleetId: string,
    fuelType: FuelType,
    enable: boolean
  ): Promise<FleetItem | null> {
    const fleet = await this.getFleetById(fleetId);
    if (!fleet) return null;

    let updatedFuelTypes = [...fleet.enabledFuelTypes];
    if (enable && !updatedFuelTypes.includes(fuelType)) {
      updatedFuelTypes.push(fuelType);
    } else if (!enable) {
      updatedFuelTypes = updatedFuelTypes.filter((f) => f !== fuelType);
    }

    return this.updateFleet(fleet.id, { enabledFuelTypes: updatedFuelTypes });
  },

  /**
   * Check if a fuel type is enabled for a category/fleet.
   */
  async isFuelEnabled(categoryOrId: string, fuelType: FuelType): Promise<boolean> {
    const fleet = await this.getFleetById(categoryOrId);
    if (!fleet || !fleet.active) return false;
    return fleet.enabledFuelTypes.includes(fuelType);
  },
};
