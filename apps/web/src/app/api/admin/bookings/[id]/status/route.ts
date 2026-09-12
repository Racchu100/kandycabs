import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateStoredBookingStatus } from '@/lib/bookingStore';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updateStatusSchema = z.object({
  status: z.enum([
    'PENDING_ADMIN',
    'DISPATCHED',
    'DRIVER_ACCEPTED',
    'TRIP_STARTED',
    'TRIP_COMPLETED',
    'CANCELLED',
  ]),
  assignedDriverId: z.string().optional(),
  cancelledBy: z.enum(['CUSTOMER', 'DRIVER', 'ADMIN']).optional(),
  cancellationReason: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { status, assignedDriverId, cancelledBy, cancellationReason } = updateStatusSchema.parse(body);
    const bookingId = params.id;

    if (status === 'DRIVER_ACCEPTED' || status === 'TRIP_STARTED' || status === 'TRIP_COMPLETED') {
      return NextResponse.json(
        { error: 'Only the assigned driver can accept dispatches, start, or complete trips via the Driver Portal.' },
        { status: 400 }
      );
    }

    // 1. Update status in bookingStore (memory)
    let fullReason = cancellationReason || '';
    if (status === 'CANCELLED' && !fullReason) {
      fullReason = `Cancelled by ${cancelledBy || 'ADMIN'}`;
    }

    updateStoredBookingStatus(bookingId, status, fullReason);

    // 2. Update status in Prisma DB if available
    let dbBooking: any = null;
    try {
      const found = await prisma.booking.findFirst({
        where: { OR: [{ id: bookingId }, { humanReadableRef: bookingId }] },
      });

      if (found) {
        const updateData: any = {
          status,
        };

        if (assignedDriverId) {
          updateData.assignedDriverId = assignedDriverId;
        }

        if (status === 'CANCELLED') {
          updateData.cancellationReason = fullReason;
        }

        dbBooking = await prisma.booking.update({
          where: { id: found.id },
          data: updateData,
          include: {
            customer: { include: { user: true } },
            assignedDriver: { include: { user: true } },
            vehicle: true,
          },
        });
      }
    } catch (dbErr) {
      console.warn('[admin/bookings/status POST] DB update fallback:', dbErr);
    }

    return NextResponse.json({
      success: true,
      message: `Booking status updated to ${status}`,
      status,
      booking: dbBooking,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update booking status' },
      { status: 400 }
    );
  }
}
