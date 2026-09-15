import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAllStoredBookings } from '@/lib/bookingStore';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const driverId = searchParams.get('driverId') || '';
    const phone = searchParams.get('phone') || '';

    // --- Resolve the actual DB driver record ---
    let resolvedDriverId = driverId;
    let resolvedPhone = phone;

    try {
      // If driverId looks like d_<phone>, extract the phone
      if (driverId && driverId.startsWith('d_')) {
        resolvedPhone = resolvedPhone || driverId.replace('d_', '');
      }
      // Try to find driver by actual DB id first
      let dbDriver: any = null;
      if (driverId && !driverId.startsWith('d_') && driverId.length > 5) {
        dbDriver = await prisma.driver.findFirst({
          where: { id: driverId },
          include: { user: true },
        });
      }
      // Fallback: find by phone
      if (!dbDriver && resolvedPhone) {
        dbDriver = await prisma.driver.findFirst({
          where: { user: { phone: resolvedPhone } },
          include: { user: true },
        });
      }
      if (dbDriver) {
        resolvedDriverId = dbDriver.id;
        resolvedPhone = dbDriver.user?.phone || resolvedPhone;
      }
    } catch (_) { /* proceed with what we have */ }

    const hasDriverFilter = !!(resolvedDriverId || resolvedPhone);

    let dbBookings: any[] = [];
    try {
      // Build where clause: only fetch trips for this specific driver
      const whereClause: any = {
        status: {
          in: ['DISPATCHED', 'DRIVER_ACCEPTED', 'TRIP_STARTED', 'TRIP_COMPLETED', 'CANCELLED'],
        },
      };

      if (hasDriverFilter) {
        // Filter: dispatched TO this driver OR assigned to this driver
        const orClauses: any[] = [];
        if (resolvedDriverId) {
          orClauses.push({ assignedDriverId: resolvedDriverId });
          orClauses.push({ dispatches: { some: { driverId: resolvedDriverId } } });
        }
        if (resolvedPhone) {
          orClauses.push({ assignedDriver: { user: { phone: resolvedPhone } } });
        }
        if (orClauses.length > 0) {
          whereClause.OR = orClauses;
        }
      }

      dbBookings = await prisma.booking.findMany({
        where: whereClause,
        include: {
          customer: { include: { user: true } },
          assignedDriver: { include: { user: true } },
          vehicle: true,
          dispatches: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (dbErr) {
      console.warn('[driver/dispatches GET] DB lookup fallback:', dbErr);
    }

    const storedBookings = getAllStoredBookings();
    const refSet = new Set<string>();
    const allBookings: any[] = [];

    for (const b of dbBookings) {
      refSet.add(b.humanReadableRef || b.id);
      allBookings.push(b);
    }

    for (const s of storedBookings) {
      if (!refSet.has(s.humanReadableRef) && !refSet.has(s.id)) {
        if (['DISPATCHED', 'DRIVER_ACCEPTED', 'TRIP_STARTED', 'TRIP_COMPLETED', 'CANCELLED'].includes(s.status)) {
          // Apply driver filter to in-memory store as well
          if (hasDriverFilter) {
            const assignedId = s.assignedDriver?.id || '';
            const assignedPhone = s.assignedDriver?.user?.phone || s.assignedDriver?.phone || '';
            const isAssigned =
              (resolvedDriverId && (assignedId === resolvedDriverId || assignedId.includes(resolvedDriverId))) ||
              (resolvedPhone && (assignedPhone === resolvedPhone || assignedPhone.includes(resolvedPhone.slice(-10)))) ||
              // Also match d_<phone> style IDs
              (resolvedPhone && assignedId === `d_${resolvedPhone}`);

            if (!isAssigned) continue;
          }
          refSet.add(s.humanReadableRef || s.id);
          allBookings.push(s);
        }
      }
    }

    // Format dispatches array — include customer phone ONLY when customerPhoneReleased === true
    const dispatches = allBookings.map((b) => {
      const isPhoneReleased = !!b.customerPhoneReleased;
      const rawPhone = b.customer?.user?.phone || b.customer?.phone || '';

      const customerObj = {
        fullName: b.customer?.fullName || 'Customer',
        phone: isPhoneReleased ? rawPhone : null,
      };

      return {
        id: `disp_${b.id}`,
        bookingId: b.id,
        booking: {
          ...b,
          customerPhoneReleased: isPhoneReleased,
          customer: customerObj,
        },
        assignedDriverId: b.assignedDriverId || b.assignedDriver?.id,
        status: b.status,
      };
    });

    // Sort dispatches so recently dispatched (DISPATCHED) trips appear at the VERY TOP FIRST (newest first)
    const statusPriority: Record<string, number> = {
      DISPATCHED: 1,
      DRIVER_ACCEPTED: 2,
      TRIP_STARTED: 3,
      TRIP_COMPLETED: 4,
      CANCELLED: 5,
    };

    dispatches.sort((a, b) => {
      const statusA = statusPriority[a.booking?.status || a.status] || 99;
      const statusB = statusPriority[b.booking?.status || b.status] || 99;

      if (statusA !== statusB) {
        return statusA - statusB;
      }

      const timeA = new Date(a.booking?.createdAt || a.booking?.scheduledAt || 0).getTime();
      const timeB = new Date(b.booking?.createdAt || b.booking?.scheduledAt || 0).getTime();
      return timeB - timeA;
    });

    return NextResponse.json({ dispatches });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch dispatches' },
      { status: 400 }
    );
  }
}
