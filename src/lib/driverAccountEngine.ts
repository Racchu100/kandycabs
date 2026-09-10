import { recordAuditLog } from '@/lib/adminEngine';

export type DriverVerificationStatus = 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED';

export interface DriverDocumentRecord {
  licenseUrl?: string;
  rcUrl?: string;
  insuranceUrl?: string;
}

export interface VehiclePhotoRecord {
  frontUrl?: string;
  leftUrl?: string;
  rightUrl?: string;
  backUrl?: string;
  interiorUrl?: string;
}

export interface DriverAccountRecord {
  id: string;
  fullName: string;
  phone: string;
  username: string;
  password?: string;
  vehicleRegistration: string;
  vehicleModel?: string;
  licenseNumber: string;
  vendorAgencyName: string;
  vendorId?: string;
  status?: string;
  verificationStatus?: DriverVerificationStatus;
  documents?: DriverDocumentRecord;
  vehiclePhotos?: VehiclePhotoRecord;
  rejectionReason?: string;
  deactivatedAt?: string;
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
    verificationStatus: 'APPROVED',
    documents: {
      licenseUrl: 'https://xgpfxtpwyavtgvycwrqu.supabase.co/storage/v1/object/public/cab-photos/driver/driver_suresh/documents/license.webp',
      rcUrl: 'https://xgpfxtpwyavtgvycwrqu.supabase.co/storage/v1/object/public/cab-photos/driver/driver_suresh/documents/rc.webp',
      insuranceUrl: 'https://xgpfxtpwyavtgvycwrqu.supabase.co/storage/v1/object/public/cab-photos/driver/driver_suresh/documents/insurance.webp',
    },
    vehiclePhotos: {
      frontUrl: 'https://xgpfxtpwyavtgvycwrqu.supabase.co/storage/v1/object/public/cab-photos/driver/driver_suresh/vehicle/ka19c4829/exterior/front.webp',
      leftUrl: 'https://xgpfxtpwyavtgvycwrqu.supabase.co/storage/v1/object/public/cab-photos/driver/driver_suresh/vehicle/ka19c4829/exterior/left.webp',
      rightUrl: 'https://xgpfxtpwyavtgvycwrqu.supabase.co/storage/v1/object/public/cab-photos/driver/driver_suresh/vehicle/ka19c4829/exterior/right.webp',
      backUrl: 'https://xgpfxtpwyavtgvycwrqu.supabase.co/storage/v1/object/public/cab-photos/driver/driver_suresh/vehicle/ka19c4829/exterior/back.webp',
      interiorUrl: 'https://xgpfxtpwyavtgvycwrqu.supabase.co/storage/v1/object/public/cab-photos/driver/driver_suresh/vehicle/ka19c4829/interior/front.webp',
    },
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
    verificationStatus: 'APPROVED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Save driver accounts list to localStorage for persistence across reloads
 */
function saveDriverAccounts(list: DriverAccountRecord[]) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('kc_driver_accounts', JSON.stringify(list));
      window.dispatchEvent(new Event('storage'));
    } catch {}
  }
}

/**
 * Helper to get list of deleted driver identifiers from localStorage
 */
export function getDeletedDriverIds(): string[] {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('kc_deleted_driver_ids');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.map((x) => String(x).toLowerCase().trim());
        }
      }
    } catch {}
  }
  return [];
}

/**
 * Permanent Unique Driver ID Generator
 */
export function getPermanentDriverId(phone: string): string {
  const cleanP = phone.replace(/\D/g, '').slice(-10);
  return cleanP ? `driver_${cleanP}` : `driver_${Date.now()}`;
}

/**
 * Get all registered drivers for Admin Console (includes active & deactivated)
 */
export function getAllDriverAccounts(includeInactive: boolean = false): DriverAccountRecord[] {
  const deletedIds = getDeletedDriverIds();

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('kc_driver_accounts');
      let parsed: DriverAccountRecord[] = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(parsed)) parsed = [];

      let modified = false;

      // Merge seed drivers from driverStore if not present in parsed
      driverStore.forEach((seed) => {
        const cleanSeedP = seed.phone.replace(/\D/g, '').slice(-10);
        const seedId = seed.id.toLowerCase().trim();
        const exists = parsed.some(
          (p) => p.id.toLowerCase() === seedId || (cleanSeedP && p.phone.replace(/\D/g, '').slice(-10) === cleanSeedP)
        );
        if (!exists) {
          parsed.push({
            ...seed,
            status: seed.status || 'ACTIVE',
            verificationStatus: seed.verificationStatus || 'APPROVED',
          });
          modified = true;
        }
      });

      // Ensure all active drivers default to APPROVED status if missing
      parsed.forEach((d) => {
        if (!d.status) {
          d.status = 'ACTIVE';
          modified = true;
        }
        if (!d.verificationStatus) {
          d.verificationStatus = 'APPROVED';
          modified = true;
        }
      });

      if (modified) {
        localStorage.setItem('kc_driver_accounts', JSON.stringify(parsed));
      }

      if (!includeInactive) {
        return parsed.filter((d) => d.status !== 'DEACTIVATED' && d.status !== 'INACTIVE');
      }

      return parsed;
    } catch {}
  }

  if (!includeInactive) {
    return driverStore.filter((seed) => seed.status !== 'DEACTIVATED' && seed.status !== 'INACTIVE');
  }
  return driverStore;
}

/**
 * Find driver account by phone, username or ID
 */
export function getDriverByPhoneOrUsername(identifier: string, activeOnly: boolean = false): DriverAccountRecord | undefined {
  if (!identifier) return undefined;
  const rawId = identifier.trim().toLowerCase();
  const cleanId = identifier.trim().replace(/\D/g, '');

  const allDrivers = getAllDriverAccounts(true);
  const matched = allDrivers.find(
    (d) =>
      d.id.toLowerCase() === rawId ||
      d.phone.trim() === identifier.trim() ||
      (cleanId.length >= 10 && d.phone.replace(/\D/g, '').slice(-10) === cleanId.slice(-10)) ||
      (d.username && d.username.toLowerCase() === rawId) ||
      (d.fullName && d.fullName.toLowerCase() === rawId)
  );

  if (!matched) return undefined;

  if (activeOnly) {
    if (matched.status === 'DEACTIVATED' || matched.status === 'INACTIVE' || matched.verificationStatus === 'REJECTED') {
      return undefined;
    }
  }

  return matched;
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

  const allDrivers = getAllDriverAccounts();
  const driver = allDrivers.find((d) => d.id === driverId || d.phone === driverId || d.username === driverId);
  if (!driver) {
    return { success: false, error: 'Driver account not found.' };
  }

  driver.password = newPassword.trim();
  driver.updatedAt = new Date().toISOString();

  // Also update in-memory seed store if present
  const seedDriver = driverStore.find((d) => d.id === driver.id);
  if (seedDriver) seedDriver.password = driver.password;

  saveDriverAccounts(allDrivers);

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
 * Verify Driver Credentials for OTP-only login
 * Strictly checks existence, verification status, and active account state
 */
export function verifyDriverOtpLogin(
  mobile: string
): { success: boolean; driver?: DriverAccountRecord; error?: string; statusReason?: 'NOT_FOUND' | 'PENDING' | 'REJECTED' | 'DEACTIVATED' } {
  const cleanMobile = mobile.trim().replace(/\D/g, '');
  if (!cleanMobile || cleanMobile.length < 10) {
    return {
      success: false,
      statusReason: 'NOT_FOUND',
      error: 'Please enter a valid 10-digit registered driver mobile number.',
    };
  }

  const driver = getDriverByPhoneOrUsername(mobile);
  if (!driver) {
    return {
      success: false,
      statusReason: 'NOT_FOUND',
      error: 'No driver account found with this Mobile Number in Admin Panel. Access denied. Please contact KANDY CABS.',
    };
  }

  if (driver.verificationStatus === 'PENDING_VERIFICATION') {
    return {
      success: false,
      driver,
      statusReason: 'PENDING',
      error: 'Your driver application is still under verification.',
    };
  }

  if (driver.verificationStatus === 'REJECTED') {
    return {
      success: false,
      driver,
      statusReason: 'REJECTED',
      error: 'Your driver application was rejected. Please contact KANDY CABS.',
    };
  }

  if (driver.status === 'DEACTIVATED' || driver.status === 'SUSPENDED') {
    return {
      success: false,
      driver,
      statusReason: 'DEACTIVATED',
      error: 'Your driver account has been deactivated. Please contact KANDY CABS.',
    };
  }

  return { success: true, driver };
}

/**
 * Verify Driver Password on Login (Legacy / Fallback)
 */
export function verifyDriverCredentials(
  identifier: string,
  inputPass: string
): { success: boolean; driver?: DriverAccountRecord; error?: string } {
  const cleanId = identifier.trim().replace(/\D/g, '');
  const allDrivers = getAllDriverAccounts();

  const driver = allDrivers.find(
    (d) =>
      d.phone === identifier.trim() ||
      (cleanId.length >= 10 && d.phone.replace(/\D/g, '').slice(-10) === cleanId.slice(-10)) ||
      d.username.toLowerCase() === identifier.trim().toLowerCase() ||
      d.id === identifier.trim()
  );

  if (!driver) {
    return { success: false, error: 'No driver account found with this Mobile Number in Admin Panel. Access denied. Please contact KANDY CABS.' };
  }

  if (driver.verificationStatus === 'PENDING_VERIFICATION') {
    return { success: false, error: 'Your driver application is still under verification.' };
  }

  if (driver.verificationStatus === 'REJECTED') {
    return { success: false, error: 'Your driver application was rejected. Please contact KANDY CABS.' };
  }

  if (driver.status === 'DEACTIVATED' || driver.status === 'SUSPENDED') {
    return { success: false, error: 'Your driver account has been deactivated. Please contact KANDY CABS.' };
  }

  if (driver.password !== inputPass.trim()) {
    return { success: false, error: 'Incorrect driver password. Please check and try again.' };
  }

  return { success: true, driver };
}

/**
 * Helper to remove driver identifier from deleted list when re-added/reactivated by Admin
 */
export function unrecordDeletedDriverId(id: string, phone?: string, username?: string, fullName?: string) {
  if (typeof window !== 'undefined') {
    try {
      let current = getDeletedDriverIds();
      const cleanP = phone ? phone.replace(/\D/g, '').slice(-10) : '';
      const cleanU = username ? username.toLowerCase().trim() : '';
      const cleanN = fullName ? fullName.toLowerCase().trim() : '';
      const cleanId = id.toLowerCase().trim();

      current = current.filter((item) => {
        const cleanItem = String(item).toLowerCase().trim();
        if (cleanItem === cleanId) return false;
        if (cleanP && cleanItem === cleanP) return false;
        if (cleanU && cleanItem === cleanU) return false;
        if (cleanN && cleanItem === cleanN) return false;
        return true;
      });

      localStorage.setItem('kc_deleted_driver_ids', JSON.stringify(current));
    } catch {}
  }
}

/**
 * Add / Reactivate Driver Account with Vendor Agency
 */
export function addDriverAccount(
  account: Omit<DriverAccountRecord, 'id' | 'createdAt' | 'updatedAt'>,
  adminName: string = 'Super Admin'
): DriverAccountRecord {
  const cleanPhone = account.phone.replace(/\D/g, '').slice(-10);
  const permId = getPermanentDriverId(account.phone);
  const cleanName = account.fullName.toLowerCase().trim();

  // Clear deletion record if present
  unrecordDeletedDriverId(permId, account.phone, account.username, account.fullName);

  const allDrivers = getAllDriverAccounts(true);

  // Check if driver record already exists (e.g. previously deactivated or registered)
  const existing = allDrivers.find((d) => {
    const dCleanP = (d.phone || '').replace(/\D/g, '').slice(-10);
    const dName = (d.fullName || '').toLowerCase().trim();
    return (
      d.id === permId ||
      (cleanPhone && dCleanP && cleanPhone === dCleanP) ||
      (cleanName && dName && cleanName === dName)
    );
  });

  let record: DriverAccountRecord;

  if (existing) {
    // REACTIVATE existing driver record & preserve all historical trips/data!
    existing.status = account.status || 'ACTIVE';
    existing.verificationStatus = account.verificationStatus || 'APPROVED';
    delete (existing as any).deactivatedAt;
    existing.fullName = account.fullName || existing.fullName;
    existing.phone = account.phone || existing.phone;
    if (account.username) existing.username = account.username;
    if (account.vehicleRegistration) existing.vehicleRegistration = account.vehicleRegistration;
    if (account.vehicleModel) existing.vehicleModel = account.vehicleModel;
    if (account.licenseNumber) existing.licenseNumber = account.licenseNumber;
    if (account.vendorAgencyName) existing.vendorAgencyName = account.vendorAgencyName;
    existing.updatedAt = new Date().toISOString();
    record = existing;
  } else {
    // CREATE new driver record with permanent ID
    record = {
      ...account,
      id: permId,
      status: account.status || 'ACTIVE',
      verificationStatus: account.verificationStatus || 'APPROVED',
      vendorAgencyName: account.vendorAgencyName || 'Sri Durga Travels & Cab Service',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    allDrivers.push(record);
  }

  saveDriverAccounts(allDrivers);

  // Auto-mark matching applicant request as ONBOARDED
  try {
    const reqs = getDriverPartnerRequests();
    const match = reqs.find((r) => {
      const rP = (r.phone || '').replace(/\D/g, '').slice(-10);
      const rN = (r.name || '').toLowerCase().trim();
      return (cleanPhone && rP && cleanPhone === rP) || (cleanName && rN && cleanName === rN);
    });
    if (match) {
      updateDriverPartnerRequestStatus(match.id, 'ONBOARDED');
    }
  } catch {}

  recordAuditLog({
    adminId: 'admin_super',
    adminName,
    action: 'ADD_DRIVER_ACCOUNT',
    targetType: 'DRIVER',
    targetId: record.id,
    details: `Registered/reactivated driver profile for ${record.fullName} (${record.phone} - Vendor Agency: ${record.vendorAgencyName})`,
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
  const allDrivers = getAllDriverAccounts(true);
  const driver = allDrivers.find((d) => d.id === driverId || d.phone === driverId);
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
  if (updates.verificationStatus) driver.verificationStatus = updates.verificationStatus;

  driver.updatedAt = new Date().toISOString();

  saveDriverAccounts(allDrivers);

  // Sync active driver session if logged in as this driver
  if (typeof window !== 'undefined') {
    try {
      const currentSession = localStorage.getItem('kc_driver_user');
      if (currentSession) {
        const parsed = JSON.parse(currentSession);
        if (
          parsed.id === driver.id ||
          parsed.phone === driver.phone ||
          (parsed.username && parsed.username.toLowerCase() === driver.username.toLowerCase())
        ) {
          localStorage.setItem('kc_driver_user', JSON.stringify(driver));
        }
      }
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('driver_account_updated', { detail: driver }));
    } catch {}
  }

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
 * Deactivate / Remove Driver Account by Admin (Preserves historical work)
 */
export function deleteDriverAccount(
  driverId: string,
  adminName: string = 'Super Admin'
): { success: boolean; error?: string } {
  let allDrivers = getAllDriverAccounts(true);
  const searchId = driverId.trim().toLowerCase();
  const cleanSearchPhone = driverId.replace(/\D/g, '').slice(-10);

  const target = allDrivers.find(
    (d) =>
      d.id.toLowerCase() === searchId ||
      d.phone.trim() === driverId.trim() ||
      (cleanSearchPhone.length >= 10 && d.phone.replace(/\D/g, '').slice(-10) === cleanSearchPhone) ||
      (d.username && d.username.toLowerCase() === searchId) ||
      (d.fullName && d.fullName.toLowerCase() === searchId)
  );

  if (!target) {
    return { success: false, error: 'Driver account not found.' };
  }

  // SOFT DEACTIVATION: Keep historical records intact in storage/DB, only set status = DEACTIVATED
  target.status = 'DEACTIVATED';
  target.verificationStatus = 'REJECTED';
  target.deactivatedAt = new Date().toISOString();
  target.updatedAt = new Date().toISOString();

  saveDriverAccounts(allDrivers);

  // Invalidate and clear active driver session if logged in as this driver
  if (typeof window !== 'undefined') {
    try {
      const currentSession = localStorage.getItem('kc_driver_user');
      if (currentSession) {
        const parsed = JSON.parse(currentSession);
        const pCleanP = (parsed.phone || '').replace(/\D/g, '').slice(-10);
        const rCleanP = (target.phone || '').replace(/\D/g, '').slice(-10);

        if (
          parsed.id === target.id ||
          parsed.phone === target.phone ||
          (pCleanP && rCleanP && pCleanP === rCleanP)
        ) {
          localStorage.removeItem('kc_driver_user');
          localStorage.removeItem('kc_driver_token');
        }
      }
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('driver_account_deleted', { detail: { id: target.id, phone: target.phone, name: target.fullName } }));
      window.dispatchEvent(new Event('auth_change'));
    } catch {}
  }

  recordAuditLog({
    adminId: 'admin_super',
    adminName,
    action: 'DEACTIVATE_DRIVER_ACCOUNT',
    targetType: 'DRIVER',
    targetId: target.id,
    details: `Deactivated driver account for ${target.fullName} (${target.phone}) - Work history preserved.`,
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
  const allDrivers = getAllDriverAccounts();
  const driver = allDrivers.find((d) => d.id === driverId);
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

/**
 * Helper to get list of deleted driver application IDs/phones from localStorage
 */
export function getDeletedDriverAppIds(): string[] {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('kc_deleted_driver_app_ids');
      if (stored) return JSON.parse(stored);
    } catch {}
  }
  return [];
}

/**
 * Permanently delete driver partner application
 */
export function deleteDriverPartnerRequest(requestId: string, phone?: string): DriverJoinRequestRecord[] {
  if (typeof window !== 'undefined') {
    try {
      const currentDeleted = getDeletedDriverAppIds();
      if (requestId && !currentDeleted.includes(requestId)) currentDeleted.push(requestId);
      if (phone) {
        const cleanP = phone.replace(/\D/g, '').slice(-10);
        if (cleanP && !currentDeleted.includes(cleanP)) currentDeleted.push(cleanP);
      }
      localStorage.setItem('kc_deleted_driver_app_ids', JSON.stringify(currentDeleted));
    } catch {}
  }

  let list = getDriverPartnerRequests();
  const cleanInputP = phone ? phone.replace(/\D/g, '').slice(-10) : '';

  list = list.filter((r) => {
    const cleanRP = (r.phone || '').replace(/\D/g, '').slice(-10);
    return r.id !== requestId && (!cleanInputP || !cleanRP || cleanRP !== cleanInputP);
  });

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('kc_driver_join_requests', JSON.stringify(list));
      window.dispatchEvent(new Event('storage'));
    } catch {}

    try {
      const url = `/api/driver-applications?id=${encodeURIComponent(requestId)}${phone ? `&phone=${encodeURIComponent(phone)}` : ''}`;
      fetch(url, { method: 'DELETE' }).catch(() => {});
    } catch {}
  }

  return list;
}

export function getDriverPartnerRequests(): DriverJoinRequestRecord[] {
  const deletedAppIds = getDeletedDriverAppIds();
  const isAppDeleted = (r: DriverJoinRequestRecord) => {
    if (!r) return true;
    if (r.status === 'REJECTED' || r.status === 'ONBOARDED') return true;
    if (deletedAppIds.includes(r.id)) return true;
    const cleanP = (r.phone || '').replace(/\D/g, '').slice(-10);
    if (cleanP && deletedAppIds.includes(cleanP)) return true;
    return false;
  };

  let list: DriverJoinRequestRecord[] = SEED_DRIVER_REQUESTS;
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('kc_driver_join_requests');
      if (stored) {
        const parsed: DriverJoinRequestRecord[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed;
        }
      } else {
        localStorage.setItem('kc_driver_join_requests', JSON.stringify(SEED_DRIVER_REQUESTS));
      }
    } catch {}

    // Auto-sync ONBOARDED status with registered driver accounts & filter deleted ones
    try {
      const registeredDrivers = getAllDriverAccounts();
      let updated = false;
      list.forEach((r) => {
        if (r.status !== 'ONBOARDED' && r.status !== 'REJECTED') {
          const rPhone = (r.phone || '').replace(/\D/g, '').slice(-10);
          const rName = (r.name || '').toLowerCase().trim();
          const isRegistered = registeredDrivers.some((d) => {
            const dPhone = (d.phone || '').replace(/\D/g, '').slice(-10);
            const dName = (d.fullName || '').toLowerCase().trim();
            return (rPhone && dPhone && rPhone === dPhone) || (rName && dName && rName === dName);
          });
          if (isRegistered) {
            r.status = 'ONBOARDED';
            updated = true;
          }
        }
      });

      const initialLen = list.length;
      list = list.filter((r) => !isAppDeleted(r));
      if (list.length !== initialLen) updated = true;

      if (updated && typeof window !== 'undefined') {
        localStorage.setItem('kc_driver_join_requests', JSON.stringify(list));
      }
    } catch {}
  }
  return list.filter((r) => !isAppDeleted(r));
}

export function updateDriverPartnerRequestStatus(
  requestId: string,
  newStatus: 'PENDING_CONTACT' | 'CONTACTED' | 'ONBOARDED' | 'REJECTED'
): DriverJoinRequestRecord[] {
  const current = getDriverPartnerRequests();
  const target = current.find((r) => r.id === requestId);
  if (target) {
    target.status = newStatus;
    if (newStatus === 'REJECTED') {
      deleteDriverPartnerRequest(target.id, target.phone);
    } else if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('kc_driver_join_requests', JSON.stringify(current));
        window.dispatchEvent(new Event('storage'));
      } catch {}
    }

    try {
      fetch('/api/driver-applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: target.id, phone: target.phone, status: newStatus }),
      }).catch(() => {});
    } catch {}
  }
  return current;
}

/**
 * Update Driver Verification Documents & Vehicle Photos
 */
export function updateDriverVerificationData(
  driverId: string,
  documents: Partial<DriverDocumentRecord>,
  vehiclePhotos: Partial<VehiclePhotoRecord>
): { success: boolean; driver?: DriverAccountRecord; error?: string } {
  const allDrivers = getAllDriverAccounts();
  const driver = allDrivers.find((d) => d.id === driverId || d.phone === driverId);
  if (!driver) {
    return { success: false, error: 'Driver account not found.' };
  }

  driver.documents = {
    ...(driver.documents || {}),
    ...documents,
  };
  driver.vehiclePhotos = {
    ...(driver.vehiclePhotos || {}),
    ...vehiclePhotos,
  };
  driver.updatedAt = new Date().toISOString();

  // If driver was previously rejected or unset, transition to PENDING_VERIFICATION on new doc submission
  if (!driver.verificationStatus || driver.verificationStatus === 'REJECTED') {
    driver.verificationStatus = 'PENDING_VERIFICATION';
  }

  saveDriverAccounts(allDrivers);

  recordAuditLog({
    adminId: 'system_driver',
    adminName: driver.fullName,
    action: 'UPDATE_DRIVER_VERIFICATION_DOCS',
    targetType: 'DRIVER',
    targetId: driver.id,
    details: `Driver ${driver.fullName} uploaded onboarding documents & vehicle photos. Verification state: ${driver.verificationStatus}`,
  });

  return { success: true, driver };
}

/**
 * Update Driver Verification Status (Admin Approval / Rejection)
 */
export function updateDriverVerificationStatus(
  driverId: string,
  status: DriverVerificationStatus,
  rejectionReason?: string,
  adminName: string = 'Super Admin'
): { success: boolean; driver?: DriverAccountRecord; error?: string } {
  const allDrivers = getAllDriverAccounts();
  const driver = allDrivers.find((d) => d.id === driverId || d.phone === driverId);
  if (!driver) {
    return { success: false, error: 'Driver account not found.' };
  }

  driver.verificationStatus = status;
  if (rejectionReason) {
    driver.rejectionReason = rejectionReason;
  }
  driver.updatedAt = new Date().toISOString();

  saveDriverAccounts(allDrivers);

  recordAuditLog({
    adminId: 'admin_super',
    adminName,
    action: status === 'APPROVED' ? 'APPROVE_DRIVER' : 'REJECT_DRIVER',
    targetType: 'DRIVER',
    targetId: driver.id,
    details: `Admin ${adminName} set verification status to ${status} for driver ${driver.fullName} (${driver.phone})`,
  });

  return { success: true, driver };
}

