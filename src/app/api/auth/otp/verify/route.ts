import { NextResponse } from 'next/server';
import { verifyMobileOtp } from '@/lib/otpAuth';
import { getCustomerByMobile, updateCustomerLastLogin, normalizeMobileNumber, registerCustomerProfile } from '@/lib/customerAccountEngine';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/adminEngine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mobile, otp } = body;

    if (!mobile || !otp) {
      return NextResponse.json({ error: 'Mobile and OTP code are required' }, { status: 400 });
    }

    const cleanMobile = normalizeMobileNumber(mobile);

    const res = verifyMobileOtp(cleanMobile, otp);
    if (!res.success) {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }

    let fullName = '';
    let customerId = `cust_${cleanMobile}`;
    let userId = `user_${cleanMobile}`;

    // 1. Check Supabase PostgreSQL DB via Prisma for User & Customer records
    try {
      const dbUser = await prisma.user.findFirst({
        where: {
          OR: [
            { phone: cleanMobile },
            { phone: `+91${cleanMobile}` },
            { phone: `91${cleanMobile}` },
          ],
        },
        include: { customer: true },
      });

      if (dbUser && dbUser.customer && dbUser.customer.fullName && dbUser.customer.fullName.trim() !== '') {
        fullName = dbUser.customer.fullName.trim();
        userId = dbUser.id;
        customerId = dbUser.customer.id;
      }
    } catch {}

    // 2. Check Supabase DB AdminBookings if not found in User table
    if (!fullName) {
      try {
        const dbBooking = await prisma.adminBooking.findFirst({
          where: {
            OR: [
              { customerPhone: cleanMobile },
              { customerPhone: `+91${cleanMobile}` },
              { customerPhone: `91${cleanMobile}` },
            ],
            NOT: { customerName: '' },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (dbBooking && dbBooking.customerName && dbBooking.customerName.trim() !== '') {
          fullName = dbBooking.customerName.trim();
        }
      } catch {}
    }

    // 3. Check local customer engine
    const localCustomer = getCustomerByMobile(cleanMobile);
    if (!fullName && localCustomer && localCustomer.fullName && localCustomer.fullName.trim() !== '') {
      fullName = localCustomer.fullName.trim();
      userId = localCustomer.id;
      customerId = localCustomer.customerId;
    }

    const isNewCustomer = !fullName || fullName.trim() === '';
    const now = new Date();

    if (fullName) {
      // Sync local engine & refresh last login timestamp
      registerCustomerProfile(cleanMobile, fullName);
      updateCustomerLastLogin(cleanMobile);
    }

    // 4. Persist Customer Login Event directly to Supabase PostgreSQL DB via Prisma
    try {
      const email = `customer_${cleanMobile}@kandycabs.com`;

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
          passwordHash: 'otp_authenticated_user',
          role: 'CUSTOMER',
          status: 'ACTIVE',
        },
      });

      if (fullName) {
        await prisma.customer.upsert({
          where: { userId: user.id },
          update: {
            fullName: fullName.trim(),
          },
          create: {
            id: customerId,
            userId: user.id,
            fullName: fullName.trim(),
          },
        });
      }

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'CUSTOMER_LOGIN',
          resource: 'CUSTOMER_PORTAL',
          details: `Customer ${fullName || cleanMobile} (+91 ${cleanMobile}) logged in successfully via Mobile OTP`,
        },
      });
    } catch (dbErr: any) {
      console.warn('Supabase DB Customer Login Log warning:', dbErr.message);
    }

    recordAuditLog({
      adminId: 'system',
      adminName: 'Customer Auth System',
      action: 'CUSTOMER_LOGIN',
      targetType: 'BOOKING',
      targetId: cleanMobile,
      details: `Customer ${fullName || cleanMobile} (${cleanMobile}) authenticated successfully via OTP`,
    });

    const userData = {
      id: userId,
      customerId,
      phone: cleanMobile,
      fullName: fullName || '',
      role: 'CUSTOMER',
      lastLoginAt: now.toISOString(),
    };

    // Set secure HTTP-only session cookie
    const response = NextResponse.json({
      success: true,
      token: res.token || `token_${Date.now()}`,
      user: userData,
      isNewCustomer,
    });

    response.cookies.set('kc_session', res.token || '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Failed to verify OTP' }, { status: 500 });
  }
}
