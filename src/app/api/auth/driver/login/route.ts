import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyDriverOtpLogin } from '@/lib/driverAccountEngine';
import { normalizeMobileNumber } from '@/lib/customerAccountEngine';
import { recordAuditLog } from '@/lib/adminEngine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mobile, otp, password } = body;

    if (!mobile) {
      return NextResponse.json({ error: 'Mobile phone number is required' }, { status: 400 });
    }

    const cleanMobile = normalizeMobileNumber(mobile);

    // 1. Verify driver authorization using Driver Engine & DB
    const authRes = verifyDriverOtpLogin(cleanMobile);
    if (!authRes.success || !authRes.driver) {
      return NextResponse.json({ error: authRes.error || 'Driver account access denied' }, { status: 403 });
    }

    const driver = authRes.driver;
    const now = new Date();

    // 2. Persist Driver Login Event directly to Supabase PostgreSQL DB via Prisma
    try {
      const email = `driver_${cleanMobile}@kandycabs.com`;
      const userId = `user_driver_${cleanMobile}`;

      const user = await prisma.user.upsert({
        where: { phone: cleanMobile },
        update: {
          updatedAt: now,
          status: 'ACTIVE',
        },
        create: {
          id: userId,
          phone: cleanMobile,
          email,
          passwordHash: password || 'driver_otp_authenticated',
          role: 'DRIVER',
          status: 'ACTIVE',
        },
      });

      await prisma.driver.upsert({
        where: { userId: user.id },
        update: {
          fullName: driver.fullName,
          isActive: true,
        },
        create: {
          id: driver.id || `driver_${cleanMobile}`,
          userId: user.id,
          fullName: driver.fullName,
          licenseNumber: driver.licenseNumber || `KA19-${cleanMobile}`,
          isActive: true,
          rating: 5.0,
        },
      });

      // Record immutable audit log in Supabase DB
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'DRIVER_LOGIN',
          resource: 'DRIVER_PORTAL',
          details: `Driver ${driver.fullName} (+91 ${cleanMobile}) logged in successfully via Chauffeur Portal`,
        },
      });
    } catch (dbErr: any) {
      console.warn('Supabase DB Driver Login Log warning:', dbErr.message);
    }

    recordAuditLog({
      adminId: 'system',
      adminName: 'Driver Portal',
      action: 'DRIVER_LOGIN',
      targetType: 'DRIVER',
      targetId: driver.id,
      details: `Driver ${driver.fullName} (${driver.phone}) authenticated successfully`,
    });

    const token = `driver_token_${Date.now()}`;
    const userData = {
      ...driver,
      role: 'DRIVER',
      canBookRides: true,
      canManageDriver: true,
      lastLoginAt: now.toISOString(),
    };

    const response = NextResponse.json({
      success: true,
      token,
      driver: userData,
    });

    response.cookies.set('kc_driver_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: 'Driver login verification failed', details: err.message }, { status: 500 });
  }
}
