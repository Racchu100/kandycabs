import { NextResponse } from 'next/server';
import { extractBearerToken, verifyToken } from '@/lib/auth';
import { getAdminStats, getAdminBookings } from '@/lib/adminEngine';

export async function GET(request: Request) {
  const token = extractBearerToken(request.headers.get('authorization'));
  const auth = verifyToken(token || '');

  if (!auth || (auth.role !== 'ADMIN' && auth.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const stats = getAdminStats();
  const bookings = getAdminBookings();

  return NextResponse.json({
    success: true,
    stats,
    bookings,
  });
}
