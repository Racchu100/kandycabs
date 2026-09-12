import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { prisma, safeDbQuery } from '@/lib/prisma';
import { getAllStoredBookings, updateStoredBookingStatus } from '@/lib/bookingStore';
import { normalizePhone } from '@kandycabs/shared';
import { z } from 'zod';

const cancelSchema = z.object({
  bookingId: z.string().min(1),
  cancellationReason: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    // 1. Verify session token
    const cookieStore = cookies();
    const token =
      cookieStore.get('kandy_session')?.value ||
      req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.phone) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authedPhone = normalizePhone(decoded.phone);
    const body = await req.json();
    const { bookingId, cancellationReason } = cancelSchema.parse(body);

    // 2. Find booking in storedBookings or DB
    const storedList = getAllStoredBookings();
    const storedBooking = storedList.find(
      (b) => b.id === bookingId || b.humanReadableRef === bookingId
    );

    let scheduledAtIso = storedBooking?.scheduledAt;
    let customerPhone = storedBooking ? normalizePhone(storedBooking.customer?.phone || storedBooking.customer?.user?.phone || '') : '';

    let dbBooking: any = null;
    if (!scheduledAtIso) {
      dbBooking = await safeDbQuery(() =>
        prisma.booking.findFirst({
          where: {
            OR: [{ id: bookingId }, { humanReadableRef: bookingId }],
          },
          include: {
            customer: { include: { user: true } },
          },
        })
      );
      if (dbBooking) {
        scheduledAtIso = dbBooking.scheduledAt.toISOString();
        customerPhone = normalizePhone(dbBooking.customer?.user?.phone || '');
      }
    }

    if (!scheduledAtIso) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Security check: ensure booking belongs to authenticated customer
    if (customerPhone && customerPhone !== authedPhone && decoded.roles?.includes('ADMIN') !== true) {
      return NextResponse.json({ error: 'Unauthorized to cancel this booking' }, { status: 403 });
    }

    // 3. 2-Hour Departure Time Check
    const scheduledTime = new Date(scheduledAtIso).getTime();
    const now = Date.now();
    const diffHours = (scheduledTime - now) / (1000 * 60 * 60);

    if (diffHours < 2) {
      return NextResponse.json(
        {
          allowed: false,
          error:
            'Rides can only be cancelled at least 2 hours before scheduled departure time. Please contact Operations (+91 98765 43210) for urgent changes.',
          diffHours: Math.max(0, diffHours).toFixed(1),
        },
        { status: 400 }
      );
    }

    // 4. Update status in memory & DB
    const reasonText = cancellationReason || 'Cancelled by customer online';
    updateStoredBookingStatus(bookingId, 'CANCELLED', reasonText);

    if (dbBooking || storedBooking) {
      safeDbQuery(async () => {
        const found = await prisma.booking.findFirst({
          where: { OR: [{ id: bookingId }, { humanReadableRef: bookingId }] },
          select: { id: true },
        });
        if (found) {
          await prisma.booking.update({
            where: { id: found.id },
            data: {
              status: 'CANCELLED',
              cancellationReason: reasonText,
            },
          });
        }
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      allowed: true,
      message: 'Booking cancelled successfully. Status updated in Admin Panel.',
      status: 'CANCELLED',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to process cancellation' },
      { status: 400 }
    );
  }
}
