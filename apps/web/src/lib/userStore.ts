import { prisma, safeDbQuery } from '@/lib/prisma';
import { normalizePhone, phoneSearchVariants, UserRole } from '@kandycabs/shared';

export interface StoredUser {
  id: string;
  phone: string;
  fullName: string;
  roles: string[];
  customer?: { fullName: string; email?: string | null } | null;
  driver?: { fullName: string; status: string; isVerifiedByAdmin: boolean } | null;
}

// In-memory global store to guarantee instant lookup (<1ms) across requests
const globalForUserRegistry = globalThis as unknown as {
  userRegistry: Map<string, StoredUser> | undefined;
};

if (!globalForUserRegistry.userRegistry || globalForUserRegistry.userRegistry.size <= 3) {
  globalForUserRegistry.userRegistry = new Map<string, StoredUser>();

  const initialUsers: [string, StoredUser][] = [
    [
      '9481086058',
      {
        id: 'u_admin_9481086058',
        phone: '9481086058',
        fullName: 'Admin Operations',
        roles: [UserRole.ADMIN, UserRole.CUSTOMER],
        customer: { fullName: 'Admin Operations' },
      },
    ],
    [
      '9999999999',
      {
        id: 'u_admin_9999999999',
        phone: '9999999999',
        fullName: 'Admin Operations',
        roles: [UserRole.ADMIN, UserRole.CUSTOMER],
        customer: { fullName: 'Admin Operations' },
      },
    ],
    [
      '8888888888',
      {
        id: 'u_driver_8888888888',
        phone: '8888888888',
        fullName: 'Ramesh Kumar (Demo Driver)',
        roles: [UserRole.DRIVER, UserRole.CUSTOMER],
        customer: { fullName: 'Ramesh Kumar (Demo Driver)' },
        driver: { fullName: 'Ramesh Kumar (Demo Driver)', status: 'APPROVED', isVerifiedByAdmin: true },
      },
    ],
    [
      '8659745632',
      {
        id: 'u_driver_8659745632',
        phone: '8659745632',
        fullName: 'Ranju',
        roles: [UserRole.DRIVER, UserRole.CUSTOMER],
        customer: { fullName: 'Ranju' },
        driver: { fullName: 'Ranju', status: 'APPROVED', isVerifiedByAdmin: true },
      },
    ],
    [
      '9844011223',
      {
        id: 'u_driver_9844011223',
        phone: '9844011223',
        fullName: 'Rajesh Gowda',
        roles: [UserRole.DRIVER, UserRole.CUSTOMER],
        customer: { fullName: 'Rajesh Gowda' },
        driver: { fullName: 'Rajesh Gowda', status: 'APPROVED', isVerifiedByAdmin: true },
      },
    ],
    [
      '9741098765',
      {
        id: 'u_driver_9741098765',
        phone: '9741098765',
        fullName: 'Ramesh Poojary',
        roles: [UserRole.DRIVER, UserRole.CUSTOMER],
        customer: { fullName: 'Ramesh Poojary' },
        driver: { fullName: 'Ramesh Poojary', status: 'APPROVED', isVerifiedByAdmin: true },
      },
    ],
    [
      '9481088776',
      {
        id: 'u_driver_9481088776',
        phone: '9481088776',
        fullName: 'Suresh Naik',
        roles: [UserRole.DRIVER, UserRole.CUSTOMER],
        customer: { fullName: 'Suresh Naik' },
        driver: { fullName: 'Suresh Naik', status: 'APPROVED', isVerifiedByAdmin: true },
      },
    ],
    [
      '9900223344',
      {
        id: 'u_driver_9900223344',
        phone: '9900223344',
        fullName: 'Mahesh Shetty',
        roles: [UserRole.DRIVER, UserRole.CUSTOMER],
        customer: { fullName: 'Mahesh Shetty' },
        driver: { fullName: 'Mahesh Shetty', status: 'APPROVED', isVerifiedByAdmin: true },
      },
    ],
    [
      '9845011998',
      {
        id: 'u_driver_9845011998',
        phone: '9845011998',
        fullName: 'Ganesh Hegde',
        roles: [UserRole.DRIVER, UserRole.CUSTOMER],
        customer: { fullName: 'Ganesh Hegde' },
        driver: { fullName: 'Ganesh Hegde', status: 'APPROVED', isVerifiedByAdmin: true },
      },
    ],
  ];

  for (const [phone, u] of initialUsers) {
    globalForUserRegistry.userRegistry.set(phone, u);
  }
}

const userRegistry = globalForUserRegistry.userRegistry;

export async function getUserByPhone(phoneInput: string): Promise<{ isRegistered: boolean; user: StoredUser | null }> {
  const last10 = normalizePhone(phoneInput);
  if (!last10 || last10.length !== 10) {
    return { isRegistered: false, user: null };
  }

  // 1. Check in-memory store first (Instant <1ms lookup)
  if (userRegistry.has(last10)) {
    const cachedUser = userRegistry.get(last10)!;
    return { isRegistered: true, user: cachedUser };
  }

  // 2. Query Prisma database with fast timeout wrapper & field selection
  const variants = phoneSearchVariants(phoneInput);
  const dbUser = await safeDbQuery(() =>
    prisma.user.findFirst({
      where: { phone: { in: variants } },
      select: {
        id: true,
        phone: true,
        fullName: true,
        roles: true,
        customer: {
          select: { fullName: true, email: true },
        },
        driver: {
          select: { fullName: true, status: true, isVerifiedByAdmin: true },
        },
      },
    })
  );

  if (dbUser) {
    const stored: StoredUser = {
      id: dbUser.id,
      phone: dbUser.phone,
      fullName: dbUser.fullName,
      roles: dbUser.roles as string[],
      customer: dbUser.customer,
      driver: dbUser.driver
        ? {
            fullName: dbUser.driver.fullName,
            status: dbUser.driver.status,
            isVerifiedByAdmin: dbUser.driver.isVerifiedByAdmin,
          }
        : null,
    };

    userRegistry.set(last10, stored);
    return { isRegistered: true, user: stored };
  }

  return { isRegistered: false, user: null };
}

export async function saveUser(
  phoneInput: string,
  fullName: string,
  email?: string
): Promise<StoredUser> {
  const last10 = normalizePhone(phoneInput);
  const isAdmin = last10 === '9481086058' || last10 === '9999999999';
  const roles = isAdmin ? [UserRole.ADMIN, UserRole.CUSTOMER] : [UserRole.CUSTOMER];

  const stored: StoredUser = {
    id: `u_${last10}`,
    phone: last10,
    fullName,
    roles,
    customer: { fullName, email: email || null },
    driver: null,
  };

  // 1. Cache in userRegistry immediately (<1ms response)
  userRegistry.set(last10, stored);

  // 2. Persist to DB using safeDbQuery with timeout wrapper
  const variants = phoneSearchVariants(phoneInput);
  safeDbQuery(async () => {
    const existing = await prisma.user.findFirst({
      where: { phone: { in: variants } },
      select: { id: true },
    });

    if (!existing) {
      const created = await prisma.user.create({
        data: {
          phone: last10,
          fullName,
          roles,
          customer: {
            create: {
              fullName,
              email: email || null,
            },
          },
        },
        select: { id: true, fullName: true },
      });
      stored.id = created.id;
    } else {
      await prisma.user.update({
        where: { id: existing.id },
        data: { fullName },
      });
      stored.id = existing.id;
    }
  }).catch(() => {});

  return stored;
}

export async function saveDriverUser(
  phoneInput: string,
  fullName: string,
  licenseNumber?: string
): Promise<StoredUser> {
  const last10 = normalizePhone(phoneInput);
  const roles = [UserRole.DRIVER, UserRole.CUSTOMER];
  const stored: StoredUser = {
    id: `u_driver_${last10}`,
    phone: last10,
    fullName,
    roles,
    customer: { fullName },
    driver: { fullName, status: 'APPROVED', isVerifiedByAdmin: true },
  };

  userRegistry.set(last10, stored);
  return stored;
}

export interface DriverDocsPayload {
  licenseNumber?: string;
  licenseDocUrl?: string; // Stored relative path e.g. drivers/d_123/documents/license.webp
  rcDocUrl?: string;      // Stored relative path e.g. drivers/d_123/documents/rc.webp
  insuranceDocUrl?: string; // Stored relative path e.g. drivers/d_123/documents/insurance.webp
  vehiclePhotos?: string[]; // Stored relative paths e.g. ["drivers/d_123/vehicle/front.webp", ...]
  vehicleName?: string;
  vehicleNumber?: string;
  isVehicleChange?: boolean;
}

const driverDocsRegistry = new Map<string, DriverDocsPayload & { docsUploaded: boolean; uploadedAt: string }>();

// Pre-seed sample driver details
const sampleDocs: [string, DriverDocsPayload][] = [
  ['8888888888', { licenseNumber: 'KA-01-2026-REG', vehicleName: 'Swift Dzire (Sedan)', vehicleNumber: 'KA-01-AB-1234' }],
  ['8659745632', { licenseNumber: 'KA-19-2024-8659', vehicleName: 'Sedan (Standard)', vehicleNumber: 'KA-19-KC-1001' }],
  ['9844011223', { licenseNumber: 'KA-19-2023-9844', vehicleName: 'Ertiga (SUV)', vehicleNumber: 'KA-19-KC-1002' }],
  ['9741098765', { licenseNumber: 'KA-19-2022-9741', vehicleName: 'Innova Crysta', vehicleNumber: 'KA-19-KC-1003' }],
  ['9481088776', { licenseNumber: 'KA-19-2021-9481', vehicleName: 'Swift Dzire (Sedan)', vehicleNumber: 'KA-19-KC-1004' }],
  ['9900223344', { licenseNumber: 'KA-19-2025-9900', vehicleName: 'Etios (Sedan)', vehicleNumber: 'KA-19-KC-1005' }],
  ['9845011998', { licenseNumber: 'KA-19-2020-9845', vehicleName: 'Tempo Traveller', vehicleNumber: 'KA-19-KC-1006' }],
];

for (const [phone, doc] of sampleDocs) {
  driverDocsRegistry.set(phone, {
    ...doc,
    docsUploaded: true,
    uploadedAt: new Date().toISOString(),
  });
}

// Helper to strip any legacy base64 strings
function sanitizeDocPath(pathOrUrl?: string): string | undefined {
  if (!pathOrUrl) return undefined;
  if (pathOrUrl.startsWith('data:image')) return undefined; // Reject legacy base64 in new path storage
  return pathOrUrl;
}

export function saveDriverDocuments(phoneInput: string, payload: DriverDocsPayload) {
  const last10 = normalizePhone(phoneInput);
  if (!last10) return null;

  const sanitizedPayload: DriverDocsPayload = {
    ...payload,
    licenseDocUrl: sanitizeDocPath(payload.licenseDocUrl),
    rcDocUrl: sanitizeDocPath(payload.rcDocUrl),
    insuranceDocUrl: sanitizeDocPath(payload.insuranceDocUrl),
    vehiclePhotos: payload.vehiclePhotos?.map(p => p ? sanitizeDocPath(p) : '') as string[] || [],
  };

  const docRecord = {
    ...sanitizedPayload,
    docsUploaded: true,
    uploadedAt: new Date().toISOString(),
  };

  driverDocsRegistry.set(last10, docRecord);

  const existing = userRegistry.get(last10);
  if (existing) {
    if (!existing.driver) {
      existing.driver = {
        fullName: existing.fullName,
        status: 'APPROVED',
        isVerifiedByAdmin: true,
      };
    }
    Object.assign(existing.driver, {
      licenseNumber: sanitizedPayload.licenseNumber || (existing.driver as any).licenseNumber,
      licenseDocUrl: sanitizedPayload.licenseDocUrl || (existing.driver as any).licenseDocUrl,
      rcDocUrl: sanitizedPayload.rcDocUrl || (existing.driver as any).rcDocUrl,
      insuranceDocUrl: sanitizedPayload.insuranceDocUrl || (existing.driver as any).insuranceDocUrl,
      vehiclePhotos: sanitizedPayload.vehiclePhotos || (existing.driver as any).vehiclePhotos || [],
      vehicleName: sanitizedPayload.vehicleName || (existing.driver as any).vehicleName,
      vehicleNumber: sanitizedPayload.vehicleNumber || (existing.driver as any).vehicleNumber,
      docsUploaded: true,
      uploadedAt: docRecord.uploadedAt,
    });
    userRegistry.set(last10, existing);
  }

  safeDbQuery(async () => {
    const dbUser = await prisma.user.findFirst({
      where: { phone: { contains: last10 } },
    });

    if (dbUser) {
      await prisma.driver.upsert({
        where: { userId: dbUser.id },
        update: {
          licenseNumber: sanitizedPayload.licenseNumber,
          licenseDocUrl: sanitizedPayload.licenseDocUrl,
          rcDocUrl: sanitizedPayload.rcDocUrl,
          insuranceDocUrl: sanitizedPayload.insuranceDocUrl,
          vehiclePhotos: sanitizedPayload.vehiclePhotos || [],
        },
        create: {
          userId: dbUser.id,
          fullName: dbUser.fullName,
          licenseNumber: sanitizedPayload.licenseNumber,
          licenseDocUrl: sanitizedPayload.licenseDocUrl,
          rcDocUrl: sanitizedPayload.rcDocUrl,
          insuranceDocUrl: sanitizedPayload.insuranceDocUrl,
          vehiclePhotos: sanitizedPayload.vehiclePhotos || [],
          status: 'APPROVED',
          isActive: true,
          isVerifiedByAdmin: true,
        },
      });
    }
  }).catch((err) => console.warn('[userStore] async saveDriverDocuments DB notice:', err));

  return docRecord;
}

export function getDriverDocuments(phoneInput: string) {
  const last10 = normalizePhone(phoneInput);
  if (!last10) return null;
  return driverDocsRegistry.get(last10) || (userRegistry.get(last10)?.driver as any) || null;
}

export function getAllStoredDrivers(): any[] {
  const drivers: any[] = [];
  for (const [phone, user] of userRegistry.entries()) {
    if (user.roles.includes(UserRole.DRIVER) || user.driver) {
      const isActive = (user as any).isActive !== false && user.driver?.status !== 'INACTIVE';
      const docRecord = driverDocsRegistry.get(phone) || (user.driver as any) || {};
      drivers.push({
        id: `d_${phone}`,
        fullName: user.fullName,
        licenseNumber: docRecord.licenseNumber || (user.driver as any)?.licenseNumber || 'KA-01-2026-REG',
        licenseDocUrl: docRecord.licenseDocUrl || (user.driver as any)?.licenseDocUrl,
        rcDocUrl: docRecord.rcDocUrl || (user.driver as any)?.rcDocUrl,
        insuranceDocUrl: docRecord.insuranceDocUrl || (user.driver as any)?.insuranceDocUrl,
        vehiclePhotos: docRecord.vehiclePhotos || (user.driver as any)?.vehiclePhotos || [],
        vehicleName: docRecord.vehicleName || (user.driver as any)?.vehicleName || 'Swift Dzire Sedan',
        vehicleNumber: docRecord.vehicleNumber || (user.driver as any)?.vehicleNumber || 'KA-01-AB-1234',
        docsUploaded: !!docRecord.docsUploaded,
        isActive,
        isVerifiedByAdmin: true,
        status: isActive ? 'APPROVED' : 'INACTIVE',
        user: { phone: user.phone },
      });
    }
  }
  return drivers;
}

export function toggleStoredDriverActive(phoneOrId: string, isActive: boolean): boolean {
  const cleanPhone = normalizePhone(phoneOrId);
  for (const [phone, user] of userRegistry.entries()) {
    if (phone === cleanPhone || user.id === phoneOrId || `d_${phone}` === phoneOrId) {
      (user as any).isActive = isActive;
      if (user.driver) {
        user.driver.status = isActive ? 'APPROVED' : 'INACTIVE';
      }
      userRegistry.set(phone, user);
      return true;
    }
  }
  return false;
}

export interface StoredDriverApplication {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  city: string;
  vehicleOwned: string;
  message?: string | null;
  status: string;
  createdAt?: string;
}

const globalForDriverApps = globalThis as unknown as {
  driverAppRegistry: Map<string, StoredDriverApplication> | undefined;
};

if (!globalForDriverApps.driverAppRegistry) {
  globalForDriverApps.driverAppRegistry = new Map<string, StoredDriverApplication>();
  globalForDriverApps.driverAppRegistry.set('app_1', {
    id: 'app_1',
    name: 'Suresh Gowda',
    phone: '7777777777',
    city: 'Bangalore',
    vehicleOwned: 'Toyota Etios (Sedan)',
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  });
}

const driverAppRegistry = globalForDriverApps.driverAppRegistry;

export function saveDriverApplication(app: Omit<StoredDriverApplication, 'id' | 'createdAt'>): StoredDriverApplication {
  const id = `app_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const fullApp: StoredDriverApplication = {
    ...app,
    id,
    createdAt: new Date().toISOString(),
  };
  driverAppRegistry.set(id, fullApp);
  return fullApp;
}

export function getAllStoredDriverApplications(): StoredDriverApplication[] {
  return Array.from(driverAppRegistry.values()).reverse();
}

export function updateStoredDriverApplicationStatus(id: string, status: string): boolean {
  const app = driverAppRegistry.get(id);
  if (app) {
    app.status = status;
    driverAppRegistry.set(id, app);
    return true;
  }
  return false;
}

