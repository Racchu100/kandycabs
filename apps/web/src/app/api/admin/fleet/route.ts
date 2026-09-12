import { NextResponse } from 'next/server';
import {
  getAllFleetVehicles,
  updateFleetVehicle,
  addFleetVehicle,
  deleteFleetVehicle,
} from '@/lib/fleetStore';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const vehicles = getAllFleetVehicles();
    return NextResponse.json({ vehicles });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch fleet catalog' }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { category, name, seatCount, baseFarePerKm, extraKmRate, driverAllowance, imageUrl, isActive } = body;

    if (!name || !category || baseFarePerKm == null) {
      return NextResponse.json({ error: 'Name, Category and Base Fare per KM are required' }, { status: 400 });
    }

    const vehicle = addFleetVehicle({
      category: category.toUpperCase().replace(/\s+/g, '_'),
      name,
      seatCount: Number(seatCount) || 4,
      baseFarePerKm: Number(baseFarePerKm),
      extraKmRate: Number(extraKmRate) || Number(baseFarePerKm) + 1,
      driverAllowance: Number(driverAllowance) || 300,
      imageUrl: imageUrl || undefined,
      isActive: isActive !== false,
    });

    try {
      await prisma.auditLog.create({
        data: {
          action: 'ADD_FLEET_VEHICLE',
          entityType: 'VEHICLE_CATEGORY',
          entityId: vehicle.id,
          afterJson: JSON.stringify(vehicle),
        },
      });
    } catch (e) {
      // audit log fallback
    }

    return NextResponse.json({ success: true, message: 'Vehicle category created successfully', vehicle });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to add vehicle' }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, category, name, seatCount, baseFarePerKm, extraKmRate, driverAllowance, isActive } = body;

    if (!id && !category) {
      return NextResponse.json({ error: 'Vehicle ID or Category is required for update' }, { status: 400 });
    }

    const targetId = id || category;
    const updated = updateFleetVehicle(targetId, {
      ...(name ? { name } : {}),
      ...(seatCount != null ? { seatCount: Number(seatCount) } : {}),
      ...(baseFarePerKm != null ? { baseFarePerKm: Number(baseFarePerKm) } : {}),
      ...(extraKmRate != null ? { extraKmRate: Number(extraKmRate) } : {}),
      ...(driverAllowance != null ? { driverAllowance: Number(driverAllowance) } : {}),
      ...(isActive != null ? { isActive: Boolean(isActive) } : {}),
      ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl } : {}),
    });

    if (!updated) {
      return NextResponse.json({ error: 'Vehicle category not found' }, { status: 404 });
    }

    try {
      await prisma.auditLog.create({
        data: {
          action: 'UPDATE_FLEET_VEHICLE_RATES',
          entityType: 'VEHICLE_CATEGORY',
          entityId: updated.id,
          afterJson: JSON.stringify(updated),
        },
      });
    } catch (e) {
      // audit log fallback
    }

    return NextResponse.json({ success: true, message: 'Fleet rates updated successfully', vehicle: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update rates' }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID parameter is required' }, { status: 400 });
    }

    const ok = deleteFleetVehicle(id);
    if (!ok) {
      return NextResponse.json({ error: 'Vehicle category not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Vehicle category removed successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete vehicle' }, { status: 400 });
  }
}
