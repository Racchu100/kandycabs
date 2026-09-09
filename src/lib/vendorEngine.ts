import { recordAuditLog } from '@/lib/adminEngine';

export interface VendorPartnerRecord {
  id: string;
  agencyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  city: string;
  fleetTypes: string; // e.g. "Sedan, SUV, Tempo Traveller"
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

// Initial Seed Vendor Partners across Mangaluru & Coastal Karnataka
const vendorStore: VendorPartnerRecord[] = [
  {
    id: 'vnd_durga',
    agencyName: 'Sri Durga Travels & Cab Service',
    contactPerson: 'Keshava Bhat',
    phone: '9845199887',
    email: 'durga@travels.in',
    city: 'Mangaluru',
    fleetTypes: 'Swift Dzire, Toyota Etios, Innova Crysta',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vnd_kudla',
    agencyName: 'Kudla Wheels Travel Desk',
    contactPerson: 'Sharath Shetty',
    phone: '9900112233',
    email: 'booking@kudlawheels.com',
    city: 'Mangaluru / Surathkal',
    fleetTypes: 'Innova Crysta, Ertiga, Tempo Traveller',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vnd_mookambika',
    agencyName: 'Coastal Mookambika Cabs',
    contactPerson: 'Prashanth Poojary',
    phone: '9740554433',
    email: 'mookambikacabs@gmail.com',
    city: 'Udupi / Kundapura',
    fleetTypes: 'Swift Dzire, Ertiga, Force Urbania',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function getAllVendorPartners(): VendorPartnerRecord[] {
  return [...vendorStore];
}

export function getVendorPartnerById(id: string): VendorPartnerRecord | undefined {
  return vendorStore.find((v) => v.id === id || v.agencyName.toLowerCase() === id.toLowerCase());
}

export function addVendorPartner(
  vendor: Omit<VendorPartnerRecord, 'id' | 'createdAt' | 'updatedAt'>,
  adminName: string = 'Super Admin'
): VendorPartnerRecord {
  const id = `vnd_${Date.now()}`;
  const record: VendorPartnerRecord = {
    ...vendor,
    id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  vendorStore.push(record);

  recordAuditLog({
    adminId: 'admin_super',
    adminName,
    action: 'ADD_VENDOR_PARTNER',
    targetType: 'VENDOR',
    targetId: id,
    details: `Added new Vendor Partner ${record.agencyName} (${record.contactPerson} - ${record.phone})`,
  });

  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('vendor_store_change'));
      localStorage.setItem('kc_vendor_sync', JSON.stringify({ vendorId: id, timestamp: Date.now() }));
    } catch {}
  }

  return record;
}
