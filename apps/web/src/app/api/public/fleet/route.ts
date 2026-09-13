import { NextResponse } from 'next/server';
import { getAllFleetVehicles } from '@/lib/fleetStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const vehicles = getAllFleetVehicles();
    return NextResponse.json({ vehicles });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch fleet catalog' }, { status: 400 });
  }
}
