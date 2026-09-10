import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractBearerToken, verifyToken } from '@/lib/auth';
import { normalizePhone, phoneSearchVariants } from '@/lib/phoneUtils';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawPhone = searchParams.get('phone') || searchParams.get('mobile');

    // 1. Try resolving token from Authorization header or cookie
    let phoneToQuery = rawPhone ? normalizePhone(rawPhone) : '';

    if (!phoneToQuery) {
      const authHeader = request.headers.get('authorization');
      const bearerToken = extractBearerToken(authHeader);
      if (bearerToken) {
        const decoded = verifyToken(bearerToken);
        if (decoded && decoded.phone) {
          phoneToQuery = normalizePhone(decoded.phone);
        }
      }
    }

    if (!phoneToQuery) {
      return NextResponse.json({ authenticated: false, isDriver: false, message: 'No phone or token provided' }, { status: 200 });
    }

    // 2. Query Supabase PostgreSQL DB via Prisma
    const dbUser = await prisma.user.findFirst({
      where: {
        OR: phoneSearchVariants(phoneToQuery),
      },
      include: {
        driver: true,
        customer: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json({
        authenticated: true,
        user: { id: `user_${phoneToQuery}`, phone: phoneToQuery, fullName: '' },
        isDriver: false,
        driver: null,
      });
    }

    const isDriver = Boolean(dbUser.driver && dbUser.driver.isActive);

    const driverInfo = isDriver
      ? {
          id: dbUser.driver!.id,
          userId: dbUser.id,
          fullName: dbUser.driver!.fullName,
          phone: phoneToQuery,
          licenseNumber: dbUser.driver!.licenseNumber,
          vehicleRegistration: 'KA 19 C 4829',
          isActive: true,
        }
      : null;

    const fullName = isDriver
      ? dbUser.driver!.fullName
      : dbUser.customer?.fullName || '';

    return NextResponse.json({
      authenticated: true,
      user: {
        id: dbUser.id,
        phone: phoneToQuery,
        fullName,
        role: isDriver ? 'DRIVER' : 'CUSTOMER',
        status: dbUser.status,
      },
      isDriver,
      driver: driverInfo,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Session check failed', details: err.message }, { status: 500 });
  }
}
