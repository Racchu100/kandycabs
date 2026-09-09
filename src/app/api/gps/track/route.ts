import { NextResponse } from 'next/server';
import { extractBearerToken, verifyToken } from '@/lib/auth';
import {
  recordDriverTelemetry,
  getAdminDriverLocations,
  updateTelemetryConfig,
} from '@/lib/gpsTelemetryEngine';

export async function POST(request: Request) {
  try {
    const token = extractBearerToken(request.headers.get('authorization'));
    const auth = verifyToken(token || '');

    if (!auth || (auth.role !== 'DRIVER' && auth.role !== 'ADMIN')) {
      return NextResponse.json(
        { error: 'Unauthorized: Driver session authentication required for GPS telemetry' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      latitude,
      longitude,
      accuracyMeters = 5,
      speedKmh = 0,
      headingDegrees = 0,
      bookingReference,
      tripState = 'TRIP_STARTED',
    } = body;

    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return NextResponse.json(
        { error: 'Invalid GPS coordinates provided' },
        { status: 400 }
      );
    }

    // Identity derived strictly from token (never trust untrusted frontend driver_id!)
    const driverId = auth.userId || 'driver_suresh';
    const driverName = auth.role === 'DRIVER' ? 'Suresh Gowda' : 'Admin Operator';
    const vehicleReg = 'KA 19 C 4829';

    const recordedPoint = recordDriverTelemetry(
      driverId,
      driverName,
      vehicleReg,
      bookingReference,
      tripState,
      latitude,
      longitude,
      accuracyMeters,
      speedKmh,
      headingDegrees
    );

    return NextResponse.json({
      success: true,
      point: recordedPoint,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to record driver GPS telemetry' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const token = extractBearerToken(request.headers.get('authorization'));
  const auth = verifyToken(token || '');

  if (!auth || (auth.role !== 'ADMIN' && auth.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const driverLocations = getAdminDriverLocations();
  return NextResponse.json({
    success: true,
    count: driverLocations.length,
    drivers: driverLocations,
  });
}
