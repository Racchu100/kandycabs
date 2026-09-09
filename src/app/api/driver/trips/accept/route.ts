import { NextResponse } from 'next/server';
import { extractBearerToken, verifyToken } from '@/lib/auth';
import { acceptTripAtomic } from '@/lib/driverTripManager';

export async function POST(request: Request) {
  try {
    const token = extractBearerToken(request.headers.get('authorization'));
    const auth = verifyToken(token || '');

    if (!auth || (auth.role !== 'DRIVER' && auth.role !== 'ADMIN' && auth.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: Driver access required' }, { status: 401 });
    }

    const body = await request.json();
    const { tripId, driverName = 'Suresh Gowda', vehicleRegistration = 'KA 19 C 4829' } = body;

    if (!tripId) {
      return NextResponse.json({ error: 'tripId is required' }, { status: 400 });
    }

    const driverId = auth.userId || 'driver_suresh';
    const result = acceptTripAtomic(tripId, driverId, driverName, vehicleRegistration);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 409 }); // 409 Conflict for race condition
    }

    return NextResponse.json({
      success: true,
      message: 'Trip accepted successfully!',
      trip: result.trip,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to accept trip' }, { status: 500 });
  }
}
