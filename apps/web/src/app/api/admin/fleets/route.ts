import { NextResponse } from 'next/server';
import { fleetRepository } from '@/lib/fleetRepository';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const fleets = await fleetRepository.getFleets();
    return NextResponse.json({ fleets });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch fleets' }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      fleetName,
      displayName,
      description,
      category,
      image,
      passengerCapacity,
      luggageCapacity,
      enabledFuelTypes,
      active,
      sortOrder,
    } = body;

    if (!fleetName || !category) {
      return NextResponse.json({ error: 'Fleet name and category are required' }, { status: 400 });
    }

    const newFleet = await fleetRepository.createFleet({
      fleetName,
      displayName: displayName || fleetName,
      description: description || '',
      category,
      image: image || 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&auto=format&fit=crop&q=60',
      passengerCapacity: Number(passengerCapacity || 4),
      luggageCapacity: Number(luggageCapacity || 2),
      enabledFuelTypes: Array.isArray(enabledFuelTypes) ? enabledFuelTypes : ['DIESEL'],
      active: active !== undefined ? active : true,
      sortOrder: Number(sortOrder || 10),
    });

    const fleets = await fleetRepository.getFleets();
    return NextResponse.json({ success: true, fleet: newFleet, fleets });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create fleet' }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, action, fuelType, enable, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Fleet ID is required' }, { status: 400 });
    }

    if (action === 'TOGGLE_FUEL' && fuelType) {
      const updated = await fleetRepository.toggleFuelType(id, fuelType, Boolean(enable));
      const fleets = await fleetRepository.getFleets();
      return NextResponse.json({ success: true, fleet: updated, fleets });
    }

    const updated = await fleetRepository.updateFleet(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Fleet not found' }, { status: 404 });
    }

    const fleets = await fleetRepository.getFleets();
    return NextResponse.json({ success: true, fleet: updated, fleets });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update fleet' }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Fleet ID is required' }, { status: 400 });
    }

    const deleted = await fleetRepository.deleteFleet(id);
    const fleets = await fleetRepository.getFleets();
    return NextResponse.json({ success: deleted, fleets });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete fleet' }, { status: 400 });
  }
}
