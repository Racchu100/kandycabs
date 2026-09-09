import { NextResponse } from 'next/server';
import { extractBearerToken, verifyToken } from '@/lib/auth';
import { getAvailableTrips } from '@/lib/driverTripManager';

export async function GET(request: Request) {
  const token = extractBearerToken(request.headers.get('authorization'));
  const auth = verifyToken(token || '');

  if (!auth || (auth.role !== 'DRIVER' && auth.role !== 'ADMIN' && auth.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized: Driver access required' }, { status: 401 });
  }

  const trips = getAvailableTrips();
  return NextResponse.json({
    success: true,
    total: trips.length,
    data: trips,
  });
}
