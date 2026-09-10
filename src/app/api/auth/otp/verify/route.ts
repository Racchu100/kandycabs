import { NextResponse } from 'next/server';
import { verifyMobileOtp } from '@/lib/otpAuth';
import { getCustomerByMobile, updateCustomerLastLogin, registerCustomerProfile } from '@/lib/customerAccountEngine';
import { getDriverByPhoneOrUsername } from '@/lib/driverAccountEngine';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/adminEngine';
import { normalizePhone, phoneSearchVariants } from '@/lib/phoneUtils';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mobile, otp } = body;

    if (!mobile || !otp) {
      return NextResponse.json({ error: 'Mobile and OTP code are required' }, { status: 400 });
    }

    const cleanMobile = normalizePhone(mobile);
    if (!cleanMobile || cleanMobile.length < 10) {
      return NextResponse.json({ error: 'Invalid 10-digit mobile number' }, { status: 400 });
    }

    const res = verifyMobileOtp(cleanMobile, otp);
    if (!res.success) {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }

    let fullName = '';
    let customerId = `cust_${cleanMobile}`;
    let userId = `user_${cleanMobile}`;

    // 1. Check Supabase PostgreSQL DB via Prisma for User, Customer, and Driver records
    try {
      const dbUser = await prisma.user.findFirst({
        where: {
          OR: phoneSearchVariants(cleanMobile),
        },
        include: { customer: true, driver: true },
      });

      if (dbUser) {
        userId = dbUser.id;
        if (dbUser.customer && dbUser.customer.fullName) {
          fullName = dbUser.customer.fullName.trim();
          customerId = dbUser.customer.id;
        } else if (dbUser.driver && dbUser.driver.fullName) {
          fullName = dbUser.driver.fullName.trim();
        }
      }
    } catch {}

    // 2. Check Supabase DB Driver record & driver status
    let isDriver = false;
    let driverData: any = null;

    try {
      const dbDriverUser = await prisma.user.findFirst({
        where: {
          OR: phoneSearchVariants(cleanMobile),
        },
        include: { driver: true },
      });

      if (dbDriverUser && dbDriverUser.driver && dbDriverUser.driver.isActive) {
        isDriver = true;
        driverData = {
          id: dbDriverUser.driver.id,
          userId: dbDriverUser.id,
          fullName: dbDriverUser.driver.fullName,
          phone: cleanMobile,
          username: cleanMobile,
          licenseNumber: dbDriverUser.driver.licenseNumber || `KA19-LIC-${cleanMobile}`,
          vehicleRegistration: 'KA 19 C 4829',
          vendorAgencyName: 'Sri Durga Travels & Cab Service',
          status: 'ACTIVE',
          verificationStatus: 'APPROVED',
          isActive: true,
        };
        if (!fullName) fullName = dbDriverUser.driver.fullName;
      }
    } catch {}

    if (!isDriver) {
      const localDriver = getDriverByPhoneOrUsername(cleanMobile, true);
      if (localDriver) {
        isDriver = true;
        driverData = localDriver;
        if (!fullName && localDriver.fullName) {
          fullName = localDriver.fullName;
        }
      }
    }

    // Check AdminBookings if assigned driver phone matches
    if (!isDriver) {
      try {
        const assignedBooking = await prisma.adminBooking.findFirst({
          where: {
            OR: [
              { driverPhone: cleanMobile },
              { driverPhone: `+91${cleanMobile}` },
              { driverPhone: `91${cleanMobile}` },
            ],
          },
        });
        if (assignedBooking && assignedBooking.assignedDriverName) {
          isDriver = true;
          driverData = {
            id: assignedBooking.assignedDriverId || `driver_${cleanMobile}`,
            fullName: assignedBooking.assignedDriverName,
            phone: cleanMobile,
            username: assignedBooking.assignedDriverName.toLowerCase().replace(/\s+/g, ''),
            vehicleRegistration: assignedBooking.assignedVehicleReg || 'KA 19 C 4829',
            vendorAgencyName: assignedBooking.vendorAgencyName || 'Sri Durga Travels & Cab Service',
            status: 'ACTIVE',
            verificationStatus: 'APPROVED',
            isActive: true,
          };
          if (!fullName) fullName = assignedBooking.assignedDriverName;
        }
      } catch {}
    }

    // 3. Check Supabase DB AdminBookings customer name if not found
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

    // 4. Check local customer engine
    const localCustomer = getCustomerByMobile(cleanMobile);
    if (!fullName && localCustomer && localCustomer.fullName && localCustomer.fullName.trim() !== '') {
      fullName = localCustomer.fullName.trim();
      userId = localCustomer.id;
      customerId = localCustomer.customerId;
    }

    const isNewCustomer = (!fullName || fullName.trim() === '') && !isDriver;
    const now = new Date();

    if (fullName) {
      registerCustomerProfile(cleanMobile, fullName);
      updateCustomerLastLogin(cleanMobile);
    }

    // 5. Persist User Login Event to Supabase PostgreSQL DB via Prisma
    try {
      const email = isDriver ? `driver_${cleanMobile}@kandycabs.com` : `customer_${cleanMobile}@kandycabs.com`;

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
          role: isDriver ? 'DRIVER' : 'CUSTOMER',
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
          action: isDriver ? 'DRIVER_LOGIN' : 'CUSTOMER_LOGIN',
          resource: isDriver ? 'DRIVER_PORTAL' : 'CUSTOMER_PORTAL',
          details: `${isDriver ? 'Driver' : 'Customer'} ${fullName || cleanMobile} (+91 ${cleanMobile}) logged in successfully via Mobile OTP`,
        },
      });
    } catch (dbErr: any) {
      console.warn('Supabase DB Login Log warning:', dbErr.message);
    }

    recordAuditLog({
      adminId: 'system',
      adminName: isDriver ? 'Driver Auth System' : 'Customer Auth System',
      action: isDriver ? 'DRIVER_LOGIN' : 'CUSTOMER_LOGIN',
      targetType: 'BOOKING',
      targetId: cleanMobile,
      details: `${isDriver ? 'Driver' : 'Customer'} ${fullName || cleanMobile} (${cleanMobile}) authenticated successfully via OTP`,
    });

    const userData = {
      id: userId,
      customerId,
      phone: cleanMobile,
      fullName: fullName || (driverData ? driverData.fullName : ''),
      role: isDriver ? 'DRIVER' : 'CUSTOMER',
      isDriver,
      driver: driverData,
      lastLoginAt: now.toISOString(),
    };

    const response = NextResponse.json({
      success: true,
      token: res.token || `token_${Date.now()}`,
      user: userData,
      isNewCustomer,
      isDriver,
      driver: driverData,
    });

    response.cookies.set('kc_session', res.token || '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Failed to verify OTP' }, { status: 500 });
  }
}
