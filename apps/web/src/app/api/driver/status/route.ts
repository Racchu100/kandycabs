import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const cookieStore = cookies();
    const token =
      cookieStore.get('kandy_session')?.value ||
      req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized session' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Lookup driver row
    const driver = await prisma.driver.findUnique({
      where: { userId: decoded.userId },
      include: { assignedVehicle: true, user: true },
    });

    if (!driver) {
      return NextResponse.json({ error: 'No driver profile found' }, { status: 404 });
    }

    // SERVER-SIDE ROUTE AUTHORIZATION GUARD REQUIREMENT FROM SPEC (§3 & Phase 4):
    // "every driver API route re-verifies driver.isActive === true && driver.isVerifiedByAdmin === true on server on every call - never trust client flag"
    if (!driver.isActive || !driver.isVerifiedByAdmin || driver.status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Driver account deactivated or pending admin verification', redirectUrl: '/customer/dashboard' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      authorized: true,
      driver,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Driver status error' }, { status: 500 });
  }
}
