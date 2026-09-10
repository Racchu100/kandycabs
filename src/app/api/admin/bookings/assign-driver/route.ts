import { NextResponse } from 'next/server';
import { extractBearerToken, verifyToken } from '@/lib/auth';
import { assignDriverToBooking } from '@/lib/adminEngine';
import { prisma } from '@/lib/prisma';
import { normalizePhone, phoneSearchVariants } from '@/lib/phoneUtils';

export async function POST(request: Request) {
  try {
    const token = extractBearerToken(request.headers.get('authorization'));
    const auth = verifyToken(token || '');

    // Allow admin or internal system dispatch calls
    if (token && (!auth || (auth.role !== 'ADMIN' && auth.role !== 'SUPER_ADMIN'))) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { bookingId, driverId, driverName, driverPhone, vehicleRegistration } = body;

    if (!bookingId || (!driverName && !driverId) || !vehicleRegistration) {
      return NextResponse.json(
        { error: 'bookingId, driver (id or name), and vehicleRegistration are required' },
        { status: 400 }
      );
    }

    const cleanDriverPhone = normalizePhone(driverPhone || driverId);

    // 1. Look up actual Driver record in Prisma PostgreSQL DB
    let dbDriver: any = null;
    try {
      dbDriver = await prisma.driver.findFirst({
        where: {
          OR: [
            { id: driverId },
            ...(cleanDriverPhone ? [{ user: { OR: phoneSearchVariants(cleanDriverPhone) } }] : []),
          ],
        },
        include: { user: true },
      });
    } catch (e: any) {
      console.warn('Prisma driver lookup warning:', e.message);
    }

    const actualDriverId = dbDriver?.id || driverId || `driver_${cleanDriverPhone}`;
    const actualDriverName = dbDriver?.fullName || driverName;
    const actualDriverPhone = dbDriver?.user?.phone || cleanDriverPhone;

    // 2. Persist booking assignment directly into Supabase PostgreSQL DB via Prisma
    let dbBooking: any = null;
    try {
      await prisma.adminBooking.updateMany({
        where: {
          OR: [
            { id: bookingId },
            { bookingReference: bookingId },
          ],
        },
        data: {
          assignedDriverId: actualDriverId,
          assignedDriverName: actualDriverName,
          driverPhone: actualDriverPhone,
          assignedVehicleReg: vehicleRegistration,
          status: 'DISPATCHED_PENDING_DRIVER_APPROVAL',
          driverApprovalStatus: 'PENDING',
        },
      });

      dbBooking = await prisma.adminBooking.findFirst({
        where: {
          OR: [
            { id: bookingId },
            { bookingReference: bookingId },
          ],
        },
      });
    } catch (dbErr: any) {
      console.warn('Supabase DB Admin Booking Assignment warning:', dbErr.message);
    }

    // 3. Update local engine memory cache
    const result = assignDriverToBooking(
      bookingId,
      actualDriverId,
      actualDriverName,
      vehicleRegistration,
      auth?.userId || 'admin_super',
      auth?.role || 'Super Admin'
    );

    return NextResponse.json({
      success: true,
      message: `Driver ${actualDriverName} assigned to booking ${bookingId} successfully`,
      booking: dbBooking || result.booking,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to assign driver', details: err.message }, { status: 500 });
  }
}
