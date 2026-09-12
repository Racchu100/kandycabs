import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { getUserByPhone } from '@/lib/userStore';
import { safeDbQuery, prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const cookieStore = cookies();
    const token =
      cookieStore.get('kandy_session')?.value ||
      req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    // 1. Fast lookup from in-memory store (<1ms)
    if (decoded.phone) {
      const { isRegistered, user } = await getUserByPhone(decoded.phone);
      if (isRegistered && user) {
        return NextResponse.json({
          authenticated: true,
          user,
        });
      }
    }

    // 2. Fallback to DB with safeDbQuery timeout wrapper
    let user: any = null;
    if (decoded.userId) {
      user = await safeDbQuery(() =>
        prisma.user.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            phone: true,
            fullName: true,
            roles: true,
            customer: { select: { fullName: true, email: true } },
            driver: { select: { fullName: true, status: true, isVerifiedByAdmin: true } },
          },
        })
      );
    }

    const userData = user
      ? {
          id: user.id,
          phone: user.phone,
          fullName: user.fullName,
          roles: user.roles,
          customer: user.customer,
          driver: user.driver,
        }
      : {
          id: decoded.userId || `u_${decoded.phone || 'session'}`,
          phone: decoded.phone || '9876543210',
          fullName: decoded.fullName || 'Valued Customer',
          roles: decoded.roles || ['CUSTOMER'],
          customer: { fullName: decoded.fullName || 'Valued Customer' },
        };

    return NextResponse.json({
      authenticated: true,
      user: userData,
    });
  } catch (err: any) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }
}
