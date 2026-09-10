import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractBearerToken, verifyToken } from '@/lib/auth';
import { normalizePhone, phoneSearchVariants } from '@/lib/phoneUtils';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawPhone = searchParams.get('phone') || searchParams.get('mobile') || searchParams.get('driverId');

    let cleanPhone = rawPhone ? normalizePhone(rawPhone) : '';

    if (!cleanPhone) {
      const authHeader = request.headers.get('authorization');
      const token = extractBearerToken(authHeader);
      if (token) {
        const decoded = verifyToken(token);
        if (decoded && decoded.phone) {
          cleanPhone = normalizePhone(decoded.phone);
        }
      }
    }

    if (!cleanPhone) {
      return NextResponse.json({ success: false, error: 'Driver phone or session token required' }, { status: 401 });
    }

    // 1. Verify driver authorization in Prisma PostgreSQL DB
    let dbDriver: any = null;
    try {
      dbDriver = await prisma.driver.findFirst({
        where: {
          user: {
            OR: phoneSearchVariants(cleanPhone),
          },
          isActive: true,
        },
        include: { user: true },
      });
    } catch (e: any) {
      console.warn('Driver lookup warning:', e.message);
    }

    // Check fallback for direct driver ID matching
    if (!dbDriver && rawPhone) {
      try {
        dbDriver = await prisma.driver.findFirst({
          where: {
            id: rawPhone,
            isActive: true,
          },
          include: { user: true },
        });
      } catch {}
    }

    if (!dbDriver) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: No active driver account found for this user' },
        { status: 403 }
      );
    }

    const driverPhoneDigits = normalizePhone(dbDriver.user?.phone || cleanPhone);

    // 2. Query ONLY bookings assigned to THIS driver from Supabase PostgreSQL DB
    let assignedBookings: any[] = [];
    try {
      assignedBookings = await prisma.adminBooking.findMany({
        where: {
          OR: [
            { assignedDriverId: dbDriver.id },
            { driverPhone: driverPhoneDigits },
            { driverPhone: `+91${driverPhoneDigits}` },
            { driverPhone: `91${driverPhoneDigits}` },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (dbErr: any) {
      console.warn('Error fetching driver trips from DB:', dbErr.message);
    }

    const driverProfile = {
      id: dbDriver.id,
      userId: dbDriver.userId,
      fullName: dbDriver.fullName,
      phone: driverPhoneDigits,
      licenseNumber: dbDriver.licenseNumber,
      vehicleRegistration: 'KA 19 C 4829',
      vendorAgencyName: 'Sri Durga Travels & Cab Service',
      status: 'ACTIVE',
      verificationStatus: 'APPROVED',
      isActive: true,
    };

    return NextResponse.json({
      success: true,
      driver: driverProfile,
      count: assignedBookings.length,
      data: assignedBookings,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch driver trips', details: err.message }, { status: 500 });
  }
}
