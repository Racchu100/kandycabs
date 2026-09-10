import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SEED_DRIVER_REQUESTS = [
  {
    name: 'Ramesh Kumar',
    phone: '9845011223',
    city: 'Mangaluru City',
    vehicleDetails: 'Swift Dzire (AC Sedan 4+1)',
    status: 'PENDING_CONTACT',
  },
  {
    name: 'Praveen Naik',
    phone: '9740223344',
    city: 'Udupi / Kundapura',
    vehicleDetails: 'Toyota Innova Crysta 7+1',
    status: 'PENDING_CONTACT',
  },
  {
    name: 'Sathish Poojary',
    phone: '9900334455',
    city: 'Subramanya / Dharmasthala',
    vehicleDetails: 'Toyota Etios (AC Sedan)',
    status: 'CONTACTED',
  },
];

export async function GET() {
  try {
    let apps = await prisma.driverApplication.findMany({
      orderBy: { createdAt: 'desc' },
    });

    if (!apps || apps.length === 0) {
      for (const seed of SEED_DRIVER_REQUESTS) {
        await prisma.driverApplication.create({ data: seed });
      }
      apps = await prisma.driverApplication.findMany({
        orderBy: { createdAt: 'desc' },
      });
    }

    return NextResponse.json({ success: true, data: apps });
  } catch (error: any) {
    console.error('Error fetching driver applications:', error);
    return NextResponse.json({ success: false, error: error.message || 'Database error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, phone, city, vehicleDetails } = body;

    if (!name || !phone) {
      return NextResponse.json({ success: false, error: 'Name and phone number are required.' }, { status: 400 });
    }

    const cleanPhone = phone.toString().replace(/[^0-9]/g, '');

    const newApp = await prisma.driverApplication.create({
      data: {
        name: name.toString().trim(),
        phone: cleanPhone,
        city: (city || 'Mangaluru').toString().trim(),
        vehicleDetails: (vehicleDetails || 'AC Sedan / SUV').toString().trim(),
        status: 'PENDING_CONTACT',
      },
    });

    return NextResponse.json({ success: true, data: newApp });
  } catch (error: any) {
    console.error('Error creating driver application:', error);
    return NextResponse.json({ success: false, error: error.message || 'Database error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, phone, status } = body;

    if (!status) {
      return NextResponse.json({ success: false, error: 'Status is required.' }, { status: 400 });
    }

    if (id) {
      const updated = await prisma.driverApplication.update({
        where: { id },
        data: { status },
      });
      return NextResponse.json({ success: true, data: updated });
    } else if (phone) {
      const cleanP = phone.toString().replace(/[^0-9]/g, '');
      const matching = await prisma.driverApplication.findMany({
        where: { phone: { contains: cleanP.slice(-10) } },
      });

      for (const item of matching) {
        await prisma.driverApplication.update({
          where: { id: item.id },
          data: { status },
        });
      }

      return NextResponse.json({ success: true, count: matching.length });
    }

    return NextResponse.json({ success: false, error: 'Must provide id or phone to update application.' }, { status: 400 });
  } catch (error: any) {
    console.error('Error updating driver application:', error);
    return NextResponse.json({ success: false, error: error.message || 'Database error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required.' }, { status: 400 });
    }

    try {
      await prisma.driverApplication.delete({
        where: { id },
      });
    } catch {}

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting driver application:', error);
    return NextResponse.json({ success: false, error: error.message || 'Database error' }, { status: 500 });
  }
}
