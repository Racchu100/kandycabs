import { recordAuditLog } from '@/lib/adminEngine';

export interface DriverAccountRecord {
  id: string;
  fullName: string;
  phone: string;
  username: string;
  password: string;
  vehicleRegistration: string;
  vehicleModel?: string;
  licenseNumber: string;
  vendorAgencyName: string;
  vendorId?: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
}

// Initial seed drivers mapped to their respective Vendor Agencies
const driverStore: DriverAccountRecord[] = [
  {
    id: 'driver_suresh',
    fullName: 'Suresh Gowda',
    phone: '9900887777',
    username: 'suresh',
    password: 'driver123',
    vehicleRegistration: 'KA 19 C 4829',
    vehicleModel: 'Swift Dzire',
    licenseNumber: 'KA19-2021-00892',
    vendorAgencyName: 'Sri Durga Travels & Cab Service',
    vendorId: 'vnd_durga',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'driver_ramesh',
    fullName: 'Ramesh Shetty',
    phone: '9845112233',
    username: 'ramesh',
    password: 'driver123',
    vehicleRegistration: 'KA 19 MD 9900',
    vehicleModel: 'Toyota Ertiga',
    licenseNumber: 'KA19-2019-00412',
    vendorAgencyName: 'Kudla Wheels Travel Desk',
    vendorId: 'vnd_kudla',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'driver_ganesh',
    fullName: 'Ganesh Poojary',
    phone: '9740556677',
    username: 'ganesh',
    password: 'driver123',
    vehicleRegistration: 'KA 19 B 1204',
    vehicleModel: 'Innova Crysta',
    licenseNumber: 'KA19-2020-00781',
    vendorAgencyName: 'Coastal Mookambika Cabs',
    vendorId: 'vnd_mookambika',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Get all registered drivers for Admin Console
 */
export function getAllDriverAccounts(): DriverAccountRecord[] {
  return [...driverStore];
}

/**
 * Find driver account by phone, username or ID
 */
export function getDriverByPhoneOrUsername(identifier: string): DriverAccountRecord | undefined {
  const cleanId = identifier.trim().replace(/\D/g, '');
  return driverStore.find(
    (d) =>
      d.phone === identifier.trim() ||
      (cleanId.length >= 10 && d.phone === cleanId) ||
      d.username.toLowerCase() === identifier.trim().toLowerCase() ||
      d.id === identifier.trim()
  );
}

/**
 * Update Driver Password by Admin
 */
export function setDriverPassword(
  driverId: string,
  newPassword: string,
  adminName: string = 'Super Admin'
): { success: boolean; driver?: DriverAccountRecord; error?: string } {
  if (!newPassword || newPassword.trim().length < 4) {
    return { success: false, error: 'Password must be at least 4 characters long.' };
  }

  const driver = driverStore.find((d) => d.id === driverId || d.phone === driverId || d.username === driverId);
  if (!driver) {
    return { success: false, error: 'Driver account not found.' };
  }

  driver.password = newPassword.trim();
  driver.updatedAt = new Date().toISOString();

  // Record Audit Log for security trail
  recordAuditLog({
    adminId: 'admin_super',
    adminName,
    action: 'UPDATE_DRIVER_PASSWORD',
    targetType: 'DRIVER',
    targetId: driver.id,
    details: `Updated password for driver ${driver.fullName} (${driver.phone} - Vendor: ${driver.vendorAgencyName})`,
  });

  return { success: true, driver };
}

/**
 * Verify Driver Password on Login
 */
export function verifyDriverCredentials(
  identifier: string,
  inputPass: string
): { success: boolean; driver?: DriverAccountRecord; error?: string } {
  const cleanId = identifier.trim().replace(/\D/g, '');

  const driver = driverStore.find(
    (d) =>
      d.phone === identifier.trim() ||
      (cleanId.length >= 10 && d.phone === cleanId) ||
      d.username.toLowerCase() === identifier.trim().toLowerCase() ||
      d.id === identifier.trim()
  );

  if (!driver) {
    return { success: false, error: 'No driver account found with this Mobile Number or Username.' };
  }

  if (driver.password !== inputPass.trim()) {
    return { success: false, error: 'Incorrect driver password. Please check and try again.' };
  }

  return { success: true, driver };
}

/**
 * Add New Driver Account with Vendor Agency
 */
export function addDriverAccount(
  account: Omit<DriverAccountRecord, 'id' | 'createdAt' | 'updatedAt'>,
  adminName: string = 'Super Admin'
): DriverAccountRecord {
  const id = `driver_${Date.now()}`;
  const record: DriverAccountRecord = {
    ...account,
    id,
    vendorAgencyName: account.vendorAgencyName || 'Sri Durga Travels & Cab Service',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  driverStore.push(record);

  recordAuditLog({
    adminId: 'admin_super',
    adminName,
    action: 'ADD_DRIVER_ACCOUNT',
    targetType: 'DRIVER',
    targetId: id,
    details: `Created new driver profile for ${record.fullName} (${record.phone} - Vendor Agency: ${record.vendorAgencyName})`,
  });

  return record;
}

/**
 * Update Full Driver Account Details by Admin
 */
export function updateDriverAccount(
  driverId: string,
  updates: Partial<Omit<DriverAccountRecord, 'id' | 'createdAt'>>,
  adminName: string = 'Super Admin'
): { success: boolean; driver?: DriverAccountRecord; error?: string } {
  const driver = driverStore.find((d) => d.id === driverId || d.phone === driverId);
  if (!driver) {
    return { success: false, error: 'Driver account not found.' };
  }

  if (updates.fullName) driver.fullName = updates.fullName.trim();
  if (updates.phone) driver.phone = updates.phone.trim();
  if (updates.username) driver.username = updates.username.trim();
  if (updates.password) driver.password = updates.password.trim();
  if (updates.vehicleRegistration) driver.vehicleRegistration = updates.vehicleRegistration.trim();
  if (updates.vehicleModel) driver.vehicleModel = updates.vehicleModel.trim();
  if (updates.licenseNumber) driver.licenseNumber = updates.licenseNumber.trim();
  if (updates.vendorAgencyName) driver.vendorAgencyName = updates.vendorAgencyName.trim();
  if (updates.vendorId) driver.vendorId = updates.vendorId;
  if (updates.status) driver.status = updates.status;

  driver.updatedAt = new Date().toISOString();

  recordAuditLog({
    adminId: 'admin_super',
    adminName,
    action: 'UPDATE_DRIVER_ACCOUNT',
    targetType: 'DRIVER',
    targetId: driver.id,
    details: `Updated driver profile for ${driver.fullName} (Phone: ${driver.phone}, Reg: ${driver.vehicleRegistration}, Vendor: ${driver.vendorAgencyName})`,
  });

  return { success: true, driver };
}

/**
 * Delete Driver Account by Admin
 */
export function deleteDriverAccount(
  driverId: string,
  adminName: string = 'Super Admin'
): { success: boolean; error?: string } {
  const idx = driverStore.findIndex((d) => d.id === driverId || d.phone === driverId);
  if (idx === -1) {
    return { success: false, error: 'Driver account not found.' };
  }

  const removed = driverStore.splice(idx, 1)[0];

  recordAuditLog({
    adminId: 'admin_super',
    adminName,
    action: 'DELETE_DRIVER_ACCOUNT',
    targetType: 'DRIVER',
    targetId: driverId,
    details: `Deleted driver account for ${removed.fullName} (${removed.phone})`,
  });

  return { success: true };
}

/**
 * Deprecated Stub: Duty Status toggle removed in Vendor Aggregator model.
 */
export function setDriverDutyStatus(
  driverId: string,
  newStatus: string
): { success: boolean; driver?: DriverAccountRecord; error?: string } {
  const driver = driverStore.find((d) => d.id === driverId);
  return { success: true, driver };
}

export interface DriverJoinRequestRecord {
  id: string;
  name: string;
  phone: string;
  city?: string;
  vehicleDetails?: string;
  status: 'PENDING_CONTACT' | 'CONTACTED' | 'ONBOARDED' | 'REJECTED';
  createdAt: string;
}

const SEED_DRIVER_REQUESTS: DriverJoinRequestRecord[] = [
  {
    id: 'drv_req_seed_1',
    name: 'Ramesh Kumar',
    phone: '9845011223',
    city: 'Mangaluru City',
    vehicleDetails: 'Swift Dzire (AC Sedan 4+1)',
    status: 'PENDING_CONTACT',
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: 'drv_req_seed_2',
    name: 'Praveen Naik',
    phone: '9740223344',
    city: 'Udupi / Kundapura',
    vehicleDetails: 'Toyota Innova Crysta 7+1',
    status: 'PENDING_CONTACT',
    createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
  },
  {
    id: 'drv_req_seed_3',
    name: 'Sathish Poojary',
    phone: '9900334455',
    city: 'Subramanya / Dharmasthala',
    vehicleDetails: 'Toyota Etios (AC Sedan)',
    status: 'CONTACTED',
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
];

export function getDriverPartnerRequests(): DriverJoinRequestRecord[] {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('kc_driver_join_requests');
      if (stored) {
        const parsed: DriverJoinRequestRecord[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      localStorage.setItem('kc_driver_join_requests', JSON.stringify(SEED_DRIVER_REQUESTS));
      return SEED_DRIVER_REQUESTS;
    } catch {}
  }
  return SEED_DRIVER_REQUESTS;
}

export function updateDriverPartnerRequestStatus(
  requestId: string,
  newStatus: 'PENDING_CONTACT' | 'CONTACTED' | 'ONBOARDED' | 'REJECTED'
): DriverJoinRequestRecord[] {
  const current = getDriverPartnerRequests();
  const target = current.find((r) => r.id === requestId);
  if (target) {
    target.status = newStatus;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('kc_driver_join_requests', JSON.stringify(current));
        window.dispatchEvent(new Event('storage'));
      } catch {}
    }
  }
  return current;
}
