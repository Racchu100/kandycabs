import { recordAuditLog } from '@/lib/adminEngine';

// Extended Admin Master KPIs
export interface AdminKpiOverview {
  totalBookings: number;
  todaysBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  activeTrips: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  pendingPayments: number;
}

export function getAdminMasterKpis(): AdminKpiOverview {
  return {
    totalBookings: 142,
    todaysBookings: 18,
    pendingBookings: 4,
    confirmedBookings: 12,
    activeTrips: 3,
    completedBookings: 118,
    cancelledBookings: 5,
    totalRevenue: 284900,
    pendingPayments: 42500,
  };
}

// Master Vehicle Management Store
export interface AdminVehicleRecord {
  id: string;
  name: string;
  category: 'sedan' | 'suv' | 'tempo' | 'luxury';
  registrationNumber: string;
  passengers: number;
  luggage: number;
  fuelType: string;
  features: string[];
  isActive: boolean;
  ratePerKm: number;
}

const vehicleStore: AdminVehicleRecord[] = [
  {
    id: 'veh_sedan_1',
    name: 'Maruti Suzuki Swift Dzire',
    category: 'sedan',
    registrationNumber: 'KA 19 C 4829',
    passengers: 4,
    luggage: 2,
    fuelType: 'CNG / Petrol',
    features: ['Air Conditioning', 'Push Seat', 'Music System', 'GPS Telemetry'],
    isActive: true,
    ratePerKm: 14,
  },
  {
    id: 'veh_suv_1',
    name: 'Toyota Innova Crysta',
    category: 'suv',
    registrationNumber: 'KA 19 MD 9900',
    passengers: 7,
    luggage: 4,
    fuelType: 'Diesel',
    features: ['Rear AC Controls', 'Leather Seats', 'Fast Charging', 'GPS Telemetry'],
    isActive: true,
    ratePerKm: 18,
  },
  {
    id: 'veh_tempo_1',
    name: 'Force Tempo Traveller (14-Seater)',
    category: 'tempo',
    registrationNumber: 'KA 19 B 1204',
    passengers: 14,
    luggage: 8,
    fuelType: 'Diesel',
    features: ['Pushback Seats', 'Individual AC Vents', 'First Aid Box', 'GPS Telemetry'],
    isActive: true,
    ratePerKm: 24,
  },
];

export function getAllVehicles(): AdminVehicleRecord[] {
  return [...vehicleStore];
}

export function toggleVehicleActive(vehicleId: string, adminName: string): boolean {
  const v = vehicleStore.find((item) => item.id === vehicleId);
  if (v) {
    v.isActive = !v.isActive;
    recordAuditLog({
      adminId: 'admin_super',
      adminName,
      action: 'TOGGLE_VEHICLE_STATUS',
      targetType: 'VEHICLE',
      targetId: vehicleId,
      details: `Set vehicle ${v.name} (${v.registrationNumber}) active state to ${v.isActive}`,
    });
    return true;
  }
  return false;
}

// Master Locations CRUD Store
export interface LocationRecord {
  id: string;
  name: string;
  category: 'Popular Route' | 'Airport' | 'Outstation';
  distanceKm: number;
  estimatedHours: number;
  isActive: boolean;
}

const locationStore: LocationRecord[] = [
  { id: 'loc_1', name: 'Mangaluru International Airport (IXE)', category: 'Airport', distanceKm: 15, estimatedHours: 0.5, isActive: true },
  { id: 'loc_2', name: 'Udupi Sri Krishna Matha', category: 'Popular Route', distanceKm: 60, estimatedHours: 1.5, isActive: true },
  { id: 'loc_3', name: 'Kollur Mookambika Temple', category: 'Outstation', distanceKm: 130, estimatedHours: 3.0, isActive: true },
  { id: 'loc_4', name: 'Dharmasthala Manjunatha Temple', category: 'Outstation', distanceKm: 75, estimatedHours: 2.0, isActive: true },
  { id: 'loc_5', name: 'Subrahmanya Kukke Temple', category: 'Outstation', distanceKm: 105, estimatedHours: 2.5, isActive: true },
];

export function getAllLocations(): LocationRecord[] {
  return [...locationStore];
}

export function toggleLocationActive(locationId: string, adminName: string): boolean {
  const loc = locationStore.find((l) => l.id === locationId);
  if (loc) {
    loc.isActive = !loc.isActive;
    recordAuditLog({
      adminId: 'admin_super',
      adminName,
      action: 'TOGGLE_LOCATION_STATUS',
      targetType: 'LOCATION',
      targetId: locationId,
      details: `Updated location ${loc.name} active state to ${loc.isActive}`,
    });
    return true;
  }
  return false;
}

// Master System Settings Store
export interface SystemSettingsConfig {
  companyName: string;
  phoneContact: string;
  whatsappContact: string;
  gstPercentage: number;
  advancePercentage: number;
  gpsUpdateIntervalMs: number;
  otpExpiryMinutes: number;
  maxOtpAttempts: number;
  imageQualityCompression: number;
}

let systemSettings: SystemSettingsConfig = {
  companyName: 'Kandy Cabs Mangaluru',
  phoneContact: '+91 99008 87777',
  whatsappContact: '+91 99008 87777',
  gstPercentage: 5,
  advancePercentage: 20,
  gpsUpdateIntervalMs: 5000,
  otpExpiryMinutes: 15,
  maxOtpAttempts: 3,
  imageQualityCompression: 85,
};

export function getSystemSettings(): SystemSettingsConfig {
  return { ...systemSettings };
}

export function updateSystemSettings(newSettings: Partial<SystemSettingsConfig>, adminName: string): SystemSettingsConfig {
  systemSettings = { ...systemSettings, ...newSettings };
  recordAuditLog({
    adminId: 'admin_super',
    adminName,
    action: 'UPDATE_SYSTEM_SETTINGS',
    targetType: 'SETTINGS',
    targetId: 'global_config',
    details: `Updated system settings: GST ${systemSettings.gstPercentage}%, GPS interval ${systemSettings.gpsUpdateIntervalMs}ms`,
  });
  return systemSettings;
}
