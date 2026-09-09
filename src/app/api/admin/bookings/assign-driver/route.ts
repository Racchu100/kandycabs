import { NextResponse } from 'next/server';
import { extractBearerToken, verifyToken } from '@/lib/auth';
import { assignDriverToBooking } from '@/lib/adminEngine';

export async function POST(request: Request) {
  try {
    const token = extractBearerToken(request.headers.get('authorization'));
    const auth = verifyToken(token || '');

    if (!auth || (auth.role !== 'ADMIN' && auth.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { bookingId, driverId = 'drv_suresh', driverName, vehicleRegistration } = body;

    if (!bookingId || !driverName || !vehicleRegistration) {
      return NextResponse.json(
        { error: 'bookingId, driverName, and vehicleRegistration are required' },
        { status: 400 }
      );
    }

    const result = assignDriverToBooking(
      bookingId,
      driverId,
      driverName,
      vehicleRegistration,
      auth.userId,
      auth.role
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Driver ${driverName} assigned to booking successfully`,
      booking: result.booking,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to assign driver' }, { status: 500 });
  }
}
