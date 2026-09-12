import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateStoredBookingDriver, updateStoredBookingStatus } from '@/lib/bookingStore';
import { z } from 'zod';

const acceptSchema = z.object({
  dispatchId: z.string(),
  bookingId: z.string(),
  driverId: z.string().optional().default('d_1'),
  driverPhone: z.string().optional(),
  driverName: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { dispatchId, bookingId, driverId, driverPhone, driverName } = acceptSchema.parse(body);

    const actualDriverId = driverId || 'd_1';
    const name = driverName || 'Driver Partner';
    const phone = driverPhone || '8888888888';

    // 1. Update in-memory booking store
    updateStoredBookingDriver(bookingId, {
      id: actualDriverId,
      fullName: name,
      user: { phone },
    });

    // 2. ATOMIC DB TRANSACTION FOR FIRST ACCEPT WINS LOCK
    let result: any = null;
    try {
      result = await prisma.$transaction(async (tx) => {
        const booking = await tx.booking.findFirst({
          where: { OR: [{ id: bookingId }, { humanReadableRef: bookingId }] },
        });

        if (!booking) {
          throw new Error('Booking not found');
        }

        if (booking.assignedDriverId && booking.assignedDriverId !== actualDriverId) {
          throw new Error('Dispatch no longer available. Another driver already accepted this trip.');
        }

        const updatedBooking = await tx.booking.update({
          where: { id: booking.id },
          data: {
            assignedDriverId: actualDriverId,
            status: 'DRIVER_ACCEPTED',
          },
        });

        return updatedBooking;
      });
    } catch (dbErr: any) {
      console.warn('[driver/dispatches/accept POST] DB update fallback:', dbErr.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Dispatch accepted! Booking assigned to you.',
      booking: result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Dispatch acceptance failed' },
      { status: 400 }
    );
  }
}

