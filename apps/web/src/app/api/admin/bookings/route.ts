import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAllStoredBookings } from '@/lib/bookingStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let dbBookings: any[] = [];
    try {
      dbBookings = await prisma.booking.findMany({
        include: {
          customer: {
            include: { user: true },
          },
          vehicle: true,
          assignedDriver: {
            include: { user: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (dbErr) {
      console.warn('[admin/bookings GET] DB lookup fallback:', dbErr);
    }

    const storedBookings = getAllStoredBookings();
    const refSet = new Set<string>();
    const bookings: any[] = [];

    // Build a fast lookup map from bookingStore by id and humanReadableRef
    const storedMap = new Map<string, any>();
    for (const s of storedBookings) {
      if (s.id) storedMap.set(s.id, s);
      if (s.humanReadableRef) storedMap.set(s.humanReadableRef, s);
    }

    for (const b of dbBookings) {
      refSet.add(b.humanReadableRef || b.id);
      // Merge live in-memory fields (otpStatus, startedBy, etc.) into the DB record
      const stored = storedMap.get(b.id) || storedMap.get(b.humanReadableRef);
      bookings.push({
        ...b,
        otpStatus: stored?.otpStatus ?? b.otpStatus ?? undefined,
        startedBy: stored?.startedBy ?? b.startedBy ?? undefined,
        overrideReason: stored?.overrideReason ?? b.overrideReason ?? undefined,
        overrideByAdminId: stored?.overrideByAdminId ?? b.overrideByAdminId ?? undefined,
      });
    }

    for (const s of storedBookings) {
      if (!refSet.has(s.humanReadableRef) && !refSet.has(s.id)) {
        refSet.add(s.humanReadableRef || s.id);
        bookings.push(s);
      }
    }

    return NextResponse.json({ bookings });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch admin bookings' },
      { status: 400 }
    );
  }
}
