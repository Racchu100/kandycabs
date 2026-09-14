import { prisma } from '@/lib/prisma';

export interface FleetVehicle {
  id: string;
  category: string;
  name: string;
  seatCount: number;
  baseFarePerKm: number;
  extraKmRate: number;
  driverAllowance: number;
  isActive: boolean;
  imageUrl?: string;
  createdAt?: string;
}

const DEFAULT_FLEET: FleetVehicle[] = [
  {
    id: 'fv_hatchback',
    category: 'HATCHBACK',
    name: 'WagonR / Indica',
    seatCount: 4,
    baseFarePerKm: 11.5,
    extraKmRate: 12.0,
    driverAllowance: 300,
    isActive: true,
    imageUrl: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: 'fv_sedan',
    category: 'SEDAN',
    name: 'Swift Dzire / Etios',
    seatCount: 4,
    baseFarePerKm: 13.5,
    extraKmRate: 14.0,
    driverAllowance: 350,
    isActive: true,
    imageUrl: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: 'fv_suv',
    category: 'SUV',
    name: 'Ertiga / Marazzo',
    seatCount: 6,
    baseFarePerKm: 17.5,
    extraKmRate: 18.0,
    driverAllowance: 400,
    isActive: true,
    imageUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: 'fv_suv_premium',
    category: 'SUV_PREMIUM',
    name: 'Toyota Innova Crysta',
    seatCount: 7,
    baseFarePerKm: 21.0,
    extraKmRate: 22.0,
    driverAllowance: 500,
    isActive: true,
    imageUrl: 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: 'fv_tempo',
    category: 'TEMPO_TRAVELER',
    name: 'Tempo Traveler Luxury',
    seatCount: 12,
    baseFarePerKm: 26.0,
    extraKmRate: 28.0,
    driverAllowance: 600,
    isActive: true,
    imageUrl: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800&auto=format&fit=crop&q=60',
  },
];

const globalForFleetStore = globalThis as unknown as {
  fleetRegistry: FleetVehicle[] | undefined;
};

if (!globalForFleetStore.fleetRegistry) {
  globalForFleetStore.fleetRegistry = [...DEFAULT_FLEET];
}

const fleetRegistry = globalForFleetStore.fleetRegistry;

export function getAllFleetVehicles(): FleetVehicle[] {
  const activeRules: any[] = (globalThis as any).pricingRulesStore || [];
  return fleetRegistry.map((v) => {
    const owRule = activeRules.find(
      (r: any) => r.tripType === 'ONEWAY' && r.vehicleCategory === v.category && r.status === 'ACTIVE'
    );
    if (owRule) {
      return {
        ...v,
        baseFarePerKm: owRule.extraKmPrice || v.baseFarePerKm,
        extraKmRate: owRule.extraKmPrice || v.extraKmRate,
        driverAllowance: owRule.driverAllowancePerDay || v.driverAllowance,
      };
    }
    return v;
  });
}

export function updateFleetVehicle(id: string, updates: Partial<FleetVehicle>): FleetVehicle | null {
  const item = fleetRegistry.find((v) => v.id === id || v.category === id);
  if (item) {
    Object.assign(item, updates);
    return item;
  }
  return null;
}

export function addFleetVehicle(vehicle: Omit<FleetVehicle, 'id'> & { id?: string }): FleetVehicle {
  const newObj: FleetVehicle = {
    id: vehicle.id || `fv_${Date.now()}`,
    ...vehicle,
  };
  fleetRegistry.push(newObj);
  return newObj;
}

export function deleteFleetVehicle(id: string): boolean {
  const idx = fleetRegistry.findIndex((v) => v.id === id || v.category === id);
  if (idx !== -1) {
    fleetRegistry.splice(idx, 1);
    return true;
  }
  return false;
}
