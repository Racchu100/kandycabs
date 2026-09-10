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
  password: string;
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
    verificationStatus: 'APPROVED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'driver_ramesh_kumar',
    fullName: 'Ramesh Kumar',
    phone: '9845011223',
    username: 'rameshkumar',
    password: 'driver123',
    vehicleRegistration: 'KA 19 C 4856',
    vehicleModel: 'Swift Dzire (AC Sedan)',
    licenseNumber: 'KA19-2021-00882',
    vendorAgencyName: 'Sri Durga Travels & Cab Service',
    vendorId: 'vnd_durga',
    verificationStatus: 'APPROVED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'driver_praveen_naik',
    fullName: 'Praveen Naik',
    phone: '9740223344',
    username: 'praveennaik',
    password: 'driver123',
    vehicleRegistration: 'KA 19 C 4868',
    vehicleModel: 'Toyota Innova Crysta',
    licenseNumber: 'KA19-2021-00878',
    vendorAgencyName: 'Kudla Wheels Travel Desk',
    vendorId: 'vnd_kudla',
    verificationStatus: 'APPROVED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'driver_sathish_poojary',
    fullName: 'Sathish Poojary',
    phone: '9900334455',
    username: 'sathishpoojary',
    password: 'driver123',
    vehicleRegistration: 'KA 19 C 4898',
    vehicleModel: 'Toyota Etios (AC Sedan)',
    licenseNumber: 'KA19-2021-00828',
    vendorAgencyName: 'Coastal Mookambika Cabs',
    vendorId: 'vnd_mookambika',
    verificationStatus: 'APPROVED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'driver_akshath',
    fullName: 'akshath',
    phone: '8088313517',
    username: 'akshath',
    password: 'driver123',
    vehicleRegistration: 'KA 19 C 4885',
    vehicleModel: 'Swift Dzire (AC Sedan)',
    licenseNumber: 'KA19-2021-00825',
    vendorAgencyName: 'Sri Durga Travels & Cab Service',
    vendorId: 'vnd_durga',
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
 * Get all registered drivers for Admin Console
 */
export function getAllDriverAccounts(): DriverAccountRecord[] {
  const deletedIds = getDeletedDriverIds();

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('kc_driver_accounts');
      let parsed: DriverAccountRecord[] = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(parsed)) parsed = [];

      let modified = false;

      // Filter out explicitly deleted drivers by ID or phone
      const initialLen = parsed.length;
      parsed = parsed.filter((d) => {
        const cleanP = (d.phone || '').replace(/\D/g, '').slice(-10);
        return !deletedIds.includes(d.id) && (!cleanP || !deletedIds.includes(cleanP));
      });
      if (parsed.length !== initialLen) modified = true;

      // Merge seed drivers from driverStore if not present in parsed
      driverStore.forEach((seed) => {
        const cleanSeedP = seed.phone.replace(/\D/g, '').slice(-10);
        const isSeedDeleted = deletedIds.includes(seed.id) || (cleanSeedP && deletedIds.includes(cleanSeedP));
        if (!isSeedDeleted) {
          const exists = parsed.some(
            (p) => p.id === seed.id || (cleanSeedP && p.phone.replace(/\D/g, '').slice(-10) === cleanSeedP)
          );
          if (!exists) {
            parsed.push(seed);
            modified = true;
          }
        }
      });

      // Ensure all drivers default to APPROVED status if missing verificationStatus
      parsed.forEach((d) => {
        if (!d.verificationStatus || d.verificationStatus === 'PENDING_VERIFICATION') {
          d.verificationStatus = 'APPROVED';
          modified = true;
        }
      });

      // Fallback: If localStorage was missing seed drivers like akshath, populate with driverStore
      if (parsed.length === 0) {
        parsed = [...driverStore];
        modified = true;
      }

      if (modified) {
        localStorage.setItem('kc_driver_accounts', JSON.stringify(parsed));
      }
      return parsed;
    } catch {}
  }
  return [...driverStore];
}

/**
 * Find driver account by phone, username or ID
 */
export function getDriverByPhoneOrUsername(identifier: string): DriverAccountRecord | undefined {
  const cleanId = identifier.trim().replace(/\D/g, '');
  const allDrivers = getAllDriverAccounts();
  return allDrivers.find(
    (d) =>
      d.phone === identifier.trim() ||
      (cleanId.length >= 10 && d.phone.replace(/\D/g, '').slice(-10) === cleanId.slice(-10)) ||
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
 * Verify Driver Password on Login
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
    return { success: false, error: 'No driver account found with this Mobile Number or Username.' };
  }

  if (driver.password !== inputPass.trim()) {
    return { success: false, error: 'Incorrect driver password. Please check and try again.' };
  }

  return { success: true, driver };
}

/**
 * Remove driver identifier from deleted list when re-added by Admin
 */
export function unrecordDeletedDriverId(id: string, phone?: string) {
  if (typeof window !== 'undefined') {
    try {
      let current = getDeletedDriverIds();
      const cleanP = phone ? phone.replace(/\D/g, '').slice(-10) : '';
      current = current.filter((item) => item !== id && (!cleanP || item !== cleanP));
      localStorage.setItem('kc_deleted_driver_ids', JSON.stringify(current));
    } catch {}
  }
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
    verificationStatus: account.verificationStatus || 'APPROVED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Remove phone/id from deleted list so re-added driver shows up in Admin Panel
  unrecordDeletedDriverId(record.id, record.phone);

  const allDrivers = getAllDriverAccounts();
  allDrivers.push(record);
  driverStore.push(record);

  saveDriverAccounts(allDrivers);

  // Auto-mark any matching applicant request as ONBOARDED
  try {
    const cleanP = record.phone.replace(/\D/g, '').slice(-10);
    const cleanN = record.fullName.toLowerCase().trim();
    const reqs = getDriverPartnerRequests();
    const match = reqs.find((r) => {
      const rP = (r.phone || '').replace(/\D/g, '').slice(-10);
      const rN = (r.name || '').toLowerCase().trim();
      return (cleanP && rP && cleanP === rP) || (cleanN && rN && cleanN === rN);
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
    targetId: id,
    details: `Created new driver profile for ${record.fullName} (${record.phone} - Vendor Agency: ${record.vendorAgencyName})`,
  });

  return record;
}

/**
 * Helper to get list of deleted driver identifiers from localStorage
 */
export function getDeletedDriverIds(): string[] {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('kc_deleted_driver_ids');
      if (stored) return JSON.parse(stored);
    } catch {}
  }
  return [];
}

/**
 * Helper to record a deleted driver ID/phone to prevent re-merging or unauthorized access
 */
function recordDeletedDriverId(id: string, phone?: string) {
  if (typeof window !== 'undefined') {
    try {
      const current = getDeletedDriverIds();
      if (id && !current.includes(id)) current.push(id);
      if (phone) {
        const cleanP = phone.replace(/\D/g, '').slice(-10);
        if (cleanP && !current.includes(cleanP)) current.push(cleanP);
      }
      localStorage.setItem('kc_deleted_driver_ids', JSON.stringify(current));
    } catch {}
  }
}

/**
 * Update Full Driver Account Details by Admin
 */
export function updateDriverAccount(
  driverId: string,
  updates: Partial<Omit<DriverAccountRecord, 'id' | 'createdAt'>>,
  adminName: string = 'Super Admin'
): { success: boolean; driver?: DriverAccountRecord; error?: string } {
  const allDrivers = getAllDriverAccounts();
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

  driver.updatedAt = new Date().toISOString();

  // Also update in-memory seed store if present
  const seedDriver = driverStore.find((d) => d.id === driver.id);
  if (seedDriver) {
    Object.assign(seedDriver, driver);
  }

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
 * Delete Driver Account by Admin
 */
export function deleteDriverAccount(
  driverId: string,
  adminName: string = 'Super Admin'
): { success: boolean; error?: string } {
  let allDrivers = getAllDriverAccounts();
  const idx = allDrivers.findIndex((d) => d.id === driverId || d.phone === driverId);
  if (idx === -1) {
    return { success: false, error: 'Driver account not found.' };
  }

  const removed = allDrivers.splice(idx, 1)[0];

  // Remove from in-memory seed store
  const seedIdx = driverStore.findIndex((d) => d.id === removed.id);
  if (seedIdx !== -1) {
    driverStore.splice(seedIdx, 1);
  }

  // Record deleted driver identifier to prevent re-merging or access
  recordDeletedDriverId(removed.id, removed.phone);

  saveDriverAccounts(allDrivers);

  // Invalidate and clear active driver session if logged in as this deleted driver
  if (typeof window !== 'undefined') {
    try {
      const currentSession = localStorage.getItem('kc_driver_user');
      if (currentSession) {
        const parsed = JSON.parse(currentSession);
        if (
          parsed.id === removed.id ||
          parsed.phone === removed.phone ||
          (parsed.username && parsed.username.toLowerCase() === removed.username.toLowerCase())
        ) {
          localStorage.removeItem('kc_driver_user');
        }
      }
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('driver_account_deleted', { detail: { id: removed.id, phone: removed.phone } }));
    } catch {}
  }

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

export function getDriverPartnerRequests(): DriverJoinRequestRecord[] {
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

    // Auto-sync ONBOARDED status with registered driver accounts
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
      if (updated && typeof window !== 'undefined') {
        localStorage.setItem('kc_driver_join_requests', JSON.stringify(list));
      }
    } catch {}
  }
  return list;
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

