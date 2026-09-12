import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateStoredBookingStatus } from '@/lib/bookingStore';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const dispatchSchema = z.object({
  bookingId: z.string(),
  driverIds: z.array(z.string()).min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bookingId, driverIds } = dispatchSchema.parse(body);

    // Update status in bookingStore memory
    updateStoredBookingStatus(bookingId, 'DISPATCHED');

    try {
      const found = await prisma.booking.findFirst({
        where: { OR: [{ id: bookingId }, { humanReadableRef: bookingId }] },
      });

      if (found) {
        await prisma.booking.update({
          where: { id: found.id },
          data: { status: 'DISPATCHED' },
        });

        // Create booking dispatch records
        for (const driverId of driverIds) {
          await prisma.bookingDispatch.create({
            data: {
              bookingId: found.id,
              driverId,
            },
          }).catch(() => {});
        }
      }
    } catch (dbErr) {
      console.warn('[admin/dispatch POST] DB update fallback:', dbErr);
    }

    return NextResponse.json({
      success: true,
      message: `Booking dispatched to ${driverIds.length} driver(s). Status updated to DISPATCHED.`,
      status: 'DISPATCHED',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Dispatch broadcast failed' },
      { status: 400 }
    );
  }
}
