import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { registerCustomerProfile, getCustomerByMobile, normalizeMobileNumber } from '@/lib/customerAccountEngine';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawPhone = searchParams.get('phone') || searchParams.get('mobile');

    if (!rawPhone) {
      return NextResponse.json({ error: 'Mobile phone number parameter is required' }, { status: 400 });
    }

    const cleanPhone = normalizeMobileNumber(rawPhone);
    let fullName = '';
    let customerId = `cust_${cleanPhone}`;
    let userId = `user_${cleanPhone}`;

    // 1. Try fetching from Supabase DB via Prisma (User & Customer tables)
    try {
      const dbUser = await prisma.user.findFirst({
        where: {
          OR: [
            { phone: cleanPhone },
            { phone: `+91${cleanPhone}` },
            { phone: `91${cleanPhone}` },
          ],
        },
        include: { customer: true },
      });

      if (dbUser && dbUser.customer && dbUser.customer.fullName) {
        fullName = dbUser.customer.fullName.trim();
        userId = dbUser.id;
        customerId = dbUser.customer.id;
      }
    } catch {}

    // 2. Try fetching from Supabase DB AdminBookings table if not found in User table
    if (!fullName) {
      try {
        const dbBooking = await prisma.adminBooking.findFirst({
          where: {
            OR: [
              { customerPhone: cleanPhone },
              { customerPhone: `+91${cleanPhone}` },
              { customerPhone: `91${cleanPhone}` },
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

    // 3. Fallback to local customer store & bookings cache
    if (!fullName) {
      const localCustomer = getCustomerByMobile(cleanPhone);
      if (localCustomer && localCustomer.fullName && localCustomer.fullName.trim() !== '') {
        fullName = localCustomer.fullName.trim();
        customerId = localCustomer.customerId;
        userId = localCustomer.id;
      }
    }

    if (!fullName) {
      return NextResponse.json({
        success: false,
        isNewCustomer: true,
        message: 'No existing customer profile found for this mobile number.',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      isNewCustomer: false,
      customer: {
        id: userId,
        customerId,
        phone: cleanPhone,
        fullName,
        role: 'CUSTOMER',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch customer profile', details: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, mobile, fullName } = body;

    const rawPhone = phone || mobile;
    if (!rawPhone || !fullName || fullName.trim().length < 2) {
      return NextResponse.json({ error: 'Valid phone number and full name are required' }, { status: 400 });
    }

    const cleanPhone = normalizeMobileNumber(rawPhone);
    const cleanName = fullName.trim();

    const customerId = `cust_${cleanPhone}`;
    const userId = `user_${cleanPhone}`;

    // 1. Save to Local Engine & Storage
    const localRes = registerCustomerProfile(cleanPhone, cleanName);

    // 2. Persist to Supabase PostgreSQL DB via Prisma (Cross-device permanent store)
    try {
      const email = `customer_${cleanPhone}@kandycabs.com`;

      const user = await prisma.user.upsert({
        where: { phone: cleanPhone },
        update: {
          updatedAt: new Date(),
          status: 'ACTIVE',
        },
        create: {
          id: userId,
          phone: cleanPhone,
          email,
          passwordHash: 'otp_authenticated_user',
          role: 'CUSTOMER',
          status: 'ACTIVE',
        },
      });

      await prisma.customer.upsert({
        where: { userId: user.id },
        update: {
          fullName: cleanName,
        },
        create: {
          id: customerId,
          userId: user.id,
          fullName: cleanName,
        },
      });
    } catch (dbErr: any) {
      console.warn('Supabase DB persistence warning:', dbErr.message);
    }

    return NextResponse.json({
      success: true,
      customer: {
        id: localRes.customer.id || userId,
        customerId: localRes.customer.customerId || customerId,
        phone: cleanPhone,
        fullName: cleanName,
        role: 'CUSTOMER',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to save customer profile', details: err.message }, { status: 500 });
  }
}
