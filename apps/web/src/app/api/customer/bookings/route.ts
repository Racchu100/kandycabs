import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { prisma, safeDbQuery } from '@/lib/prisma';
import { getAllStoredBookings } from '@/lib/bookingStore';
import { normalizePhone } from '@kandycabs/shared';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const queryPhone = url.searchParams.get('phone');
    const headerPhone = req.headers.get('x-customer-phone');

    const cookieStore = cookies();
    const token =
      cookieStore.get('kandy_session')?.value ||
      req.headers.get('authorization')?.replace('Bearer ', '');

    let authedPhone = '';
    let authedUserId = '';

    if (token) {
      const decoded = verifyToken(token);
      if (decoded?.phone) {
        authedPhone = normalizePhone(decoded.phone);
        authedUserId = decoded.userId;
      }
    }

    if (!authedPhone && queryPhone) {
      authedPhone = normalizePhone(queryPhone);
    }
    if (!authedPhone && headerPhone) {
      authedPhone = normalizePhone(headerPhone);
    }

    if (!authedPhone) {
      return NextResponse.json({ bookings: [] });
    }

    let dbBookings: any[] = [];
    if (authedUserId) {
      const fetched = await safeDbQuery(async () => {
        const customer = await prisma.customer.findUnique({
          where: { userId: authedUserId },
          select: { id: true },
        });

        if (!customer) return [];

        return prisma.booking.findMany({
          where: { customerId: customer.id },
          select: {
            id: true,
            humanReadableRef: true,
            tripType: true,
            pickupAddress: true,
            dropAddress: true,
            scheduledAt: true,
            distanceKm: true,
            estimatedFare: true,
            advanceAmount: true,
            advancePaymentStatus: true,
            balanceAmount: true,
            balancePaymentStatus: true,
            status: true,
            createdAt: true,
            vehicle: {
              select: { name: true, category: true },
            },
            assignedDriver: {
              select: {
                fullName: true,
                licenseNumber: true,
                user: { select: { phone: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
      });

      if (fetched) {
        dbBookings = fetched;
      }
    }

    // Filter in-memory stored bookings strictly by the authenticated user's phone
    const storedBookings = getAllStoredBookings();
    const refSet = new Set<string>();
    const bookings: any[] = [];

    for (const b of dbBookings) {
      refSet.add(b.humanReadableRef || b.id);
      bookings.push(b);
    }

    for (const s of storedBookings) {
      if (!refSet.has(s.humanReadableRef) && !refSet.has(s.id)) {
        const bookingPhone = normalizePhone(s.customer?.phone || s.customer?.user?.phone || '');
        if (bookingPhone !== authedPhone) continue;
        refSet.add(s.humanReadableRef || s.id);
        bookings.push(s);
      }
    }

    return NextResponse.json({ bookings });
  } catch (err: any) {
    return NextResponse.json({ bookings: [] });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phone = normalizePhone(body.customerPhone || body.phone || '');
    const ref = body.id || `KC${Math.floor(10000 + Math.random() * 90000)}`;

    const newBooking = {
      id: ref,
      humanReadableRef: ref,
      tripType: body.tripType || 'ONEWAY',
      pickupAddress: body.pickupAddress || body.pickup || 'Pickup Location',
      dropAddress: body.dropAddress || body.drop || 'Drop Location',
      scheduledAt: body.scheduledAt || body.pickupDate || new Date().toISOString(),
      distanceKm: Number(body.estimatedDistanceKm || body.distanceKm || 50),
      estimatedFare: Number(body.estimatedFare || body.totalFare || 0),
      advanceAmount: Number(body.advanceAmount || body.advancePaid || 0),
      advancePaymentStatus: 'PAID',
      balanceAmount: Number(body.balanceAmount || body.balanceDue || 0),
      balancePaymentStatus: 'PENDING',
      tollAmount: 0,
      status: 'CONFIRMED',
      customerPhoneReleased: false,
      customer: {
        fullName: body.customerName || 'Customer',
        phone: phone,
        user: { phone: phone },
      },
      vehicle: {
        name: body.vehicleName || 'Swift Dzire (Sedan)',
      },
      createdAt: new Date().toISOString(),
    };

    const { addStoredBooking } = await import('@/lib/bookingStore');
    addStoredBooking(newBooking as any);

    return NextResponse.json({ success: true, booking: newBooking });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create booking' }, { status: 400 });
  }
}
