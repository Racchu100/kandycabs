import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Global server instance memory store for zero-latency fallbacks across requests
const globalStore = global as unknown as {
  driverApplicationsMemory?: any[];
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

const memoryApps = globalStore.driverApplicationsMemory;

export async function GET() {
  try {
    const dbApps = await prisma.driverApplication.findMany({
      orderBy: { createdAt: 'desc' },
    });

    if (dbApps && dbApps.length > 0) {
      // Merge memory apps into DB list (avoid duplicates by ID or phone)
      const dbPhones = new Set(dbApps.map((a) => a.phone));
      const memoryOnly = memoryApps.filter((m) => !dbPhones.has(m.phone));
      const combined = [...dbApps, ...memoryOnly];
      return NextResponse.json({ success: true, data: combined });
    } else {
      // Seed DB asynchronously
      for (const seed of memoryApps) {
        try {
          await prisma.driverApplication.create({
            data: {
              name: seed.name,
              phone: seed.phone,
              city: seed.city || 'Mangaluru',
              vehicleDetails: seed.vehicleDetails || 'AC Sedan',
              status: seed.status || 'PENDING_CONTACT',
            },
          });
        } catch {}
      }
    }
  } catch (error) {
    console.warn('Prisma DB query fallback in driver-applications GET:', error);
  }

  return NextResponse.json({ success: true, data: memoryApps });
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

    // Store in global memory store immediately
    memoryApps.unshift(newAppRecord);

    // Persist in Prisma database
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

    // Update memory store
    memoryApps.forEach((item) => {
      if (item.id === id || (phone && item.phone.includes(phone.toString().replace(/\D/g, '').slice(-10)))) {
        item.status = status;
      }
    });

    // Update Prisma DB
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

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required.' }, { status: 400 });
    }

    // Remove from memory store
    const idx = memoryApps.findIndex((a) => a.id === id);
    if (idx !== -1) {
      memoryApps.splice(idx, 1);
    }

    // Remove from Prisma DB
    try {
      await prisma.driverApplication.delete({
        where: { id },
      });
    } catch {}

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
