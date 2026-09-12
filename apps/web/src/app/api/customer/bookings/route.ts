import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { prisma, safeDbQuery } from '@/lib/prisma';
import { getAllStoredBookings } from '@/lib/bookingStore';
import { normalizePhone } from '@kandycabs/shared';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // 1. Enforce Server-Side Session Verification (prevents Customer A from accessing Customer B's bookings)
    const cookieStore = cookies();
    const token =
      cookieStore.get('kandy_session')?.value ||
      req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized', bookings: [] }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.phone) {
      return NextResponse.json({ error: 'Unauthorized', bookings: [] }, { status: 401 });
    }

    // Session-bound authenticated identity
    const authedUserId = decoded.userId;
    const authedPhone = normalizePhone(decoded.phone);

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
      if (b.advancePaymentStatus === 'PAID') {
        refSet.add(b.humanReadableRef || b.id);
        bookings.push(b);
      }
    }

    for (const s of storedBookings) {
      if (!refSet.has(s.humanReadableRef) && !refSet.has(s.id)) {
        const bookingPhone = normalizePhone(s.customer?.phone || s.customer?.user?.phone || '');
        if (bookingPhone !== authedPhone) continue;
        if (s.advancePaymentStatus === 'PAID') {
          refSet.add(s.humanReadableRef || s.id);
          bookings.push(s);
        }
      }
    }

    return NextResponse.json({ bookings });
  } catch (err: any) {
    return NextResponse.json({ bookings: [] });
  }
}
