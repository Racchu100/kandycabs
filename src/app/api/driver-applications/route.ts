import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Global server instance memory store for zero-latency fallbacks across requests
const globalStore = global as unknown as {
  driverApplicationsMemory?: any[];
  deletedDriverAppIds?: Set<string>;
};

if (!globalStore.driverApplicationsMemory) {
  globalStore.driverApplicationsMemory = [
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
}

if (!globalStore.deletedDriverAppIds) {
  globalStore.deletedDriverAppIds = new Set<string>();
}

const memoryApps = globalStore.driverApplicationsMemory;
const deletedAppIds = globalStore.deletedDriverAppIds;

function isAppDeleted(app: any): boolean {
  if (!app) return true;
  if (app.status === 'REJECTED' || app.status === 'ONBOARDED') return true;
  if (deletedAppIds.has(app.id)) return true;
  const cleanP = (app.phone || '').toString().replace(/\D/g, '').slice(-10);
  if (cleanP && (deletedAppIds.has(cleanP) || deletedAppIds.has(`phone_${cleanP}`))) return true;
  return false;
}

export async function GET() {
  try {
    const dbApps = await prisma.driverApplication.findMany({
      where: {
        status: { notIn: ['REJECTED', 'ONBOARDED'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (dbApps && dbApps.length > 0) {
      const dbPhones = new Set(dbApps.map((a) => a.phone));
      const memoryOnly = memoryApps.filter((m) => !dbPhones.has(m.phone));
      const combined = [...dbApps, ...memoryOnly].filter((a) => !isAppDeleted(a));
      return NextResponse.json({ success: true, data: combined });
    }
  } catch (error) {
    console.warn('Prisma DB query fallback in driver-applications GET:', error);
  }

  const filteredMemory = memoryApps.filter((a) => !isAppDeleted(a));
  return NextResponse.json({ success: true, data: filteredMemory });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, phone, city, vehicleDetails } = body;

    if (!name || !phone) {
      return NextResponse.json({ success: false, error: 'Name and phone number are required.' }, { status: 400 });
    }

    const cleanPhone = phone.toString().replace(/[^0-9]/g, '');

    const newAppRecord = {
      id: `drv_app_${Date.now()}`,
      name: name.toString().trim(),
      phone: cleanPhone,
      city: (city || 'Mangaluru').toString().trim(),
      vehicleDetails: (vehicleDetails || 'AC Sedan / SUV').toString().trim(),
      status: 'PENDING_CONTACT',
      createdAt: new Date().toISOString(),
    };

    memoryApps.unshift(newAppRecord);

    try {
      const createdInDb = await prisma.driverApplication.create({
        data: {
          name: newAppRecord.name,
          phone: newAppRecord.phone,
          city: newAppRecord.city,
          vehicleDetails: newAppRecord.vehicleDetails,
          status: 'PENDING_CONTACT',
        },
      });
      newAppRecord.id = createdInDb.id;
    } catch (dbErr) {
      console.warn('Prisma DB insert fallback in driver-applications POST:', dbErr);
    }

    return NextResponse.json({ success: true, data: newAppRecord });
  } catch (error: any) {
    console.error('Error creating driver application:', error);
    return NextResponse.json({ success: false, error: error.message || 'Error saving application' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, phone, status } = body;

    if (!status) {
      return NextResponse.json({ success: false, error: 'Status is required.' }, { status: 400 });
    }

    if (id) deletedAppIds.add(id);
    if (phone) {
      const cleanP = phone.toString().replace(/[^0-9]/g, '').slice(-10);
      if (cleanP) deletedAppIds.add(`phone_${cleanP}`);
    }

    memoryApps.forEach((item) => {
      if (item.id === id || (phone && item.phone.includes(phone.toString().replace(/\D/g, '').slice(-10)))) {
        item.status = status;
      }
    });

    try {
      if (id) {
        await prisma.driverApplication.update({
          where: { id },
          data: { status },
        });
      } else if (phone) {
        const cleanP = phone.toString().replace(/[^0-9]/g, '');
        const matching = await prisma.driverApplication.findMany({
          where: { phone: { contains: cleanP.slice(-10) } },
        });
        for (const m of matching) {
          await prisma.driverApplication.update({
            where: { id: m.id },
            data: { status },
          });
        }
      }
    } catch (dbErr) {
      console.warn('Prisma DB update fallback in driver-applications PATCH:', dbErr);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const phone = searchParams.get('phone');

    if (!id && !phone) {
      return NextResponse.json({ success: false, error: 'ID or phone is required.' }, { status: 400 });
    }

    if (id) deletedAppIds.add(id);
    if (phone) {
      const cleanP = phone.replace(/\D/g, '').slice(-10);
      if (cleanP) deletedAppIds.add(`phone_${cleanP}`);
    }

    for (let i = memoryApps.length - 1; i >= 0; i--) {
      const item = memoryApps[i];
      const cleanItemP = (item.phone || '').replace(/\D/g, '').slice(-10);
      const cleanInputP = (phone || id || '').replace(/\D/g, '').slice(-10);
      if (item.id === id || (cleanInputP && cleanItemP && cleanItemP === cleanInputP)) {
        memoryApps.splice(i, 1);
      }
    }

    try {
      if (id) {
        await prisma.driverApplication.deleteMany({
          where: { id },
        });
      }
      if (phone) {
        const cleanP = phone.replace(/\D/g, '').slice(-10);
        await prisma.driverApplication.deleteMany({
          where: { phone: { contains: cleanP } },
        });
      }
    } catch {}

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
