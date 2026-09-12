import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateStoredBookingStatus } from '@/lib/bookingStore';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const driverStatusSchema = z.object({
  status: z.enum(['DRIVER_ACCEPTED', 'TRIP_STARTED', 'TRIP_COMPLETED', 'CANCELLED', 'PENDING_ADMIN']),
  cancellationReason: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { status, cancellationReason } = driverStatusSchema.parse(body);
    const bookingId = params.id;

    let reason = cancellationReason || '';
    if (status === 'CANCELLED' && !reason) {
      reason = 'Cancelled by Driver';
    }

    updateStoredBookingStatus(bookingId, status, reason);

    try {
      const found = await prisma.booking.findFirst({
        where: { OR: [{ id: bookingId }, { humanReadableRef: bookingId }] },
      });

      if (found) {
        await prisma.booking.update({
          where: { id: found.id },
          data: {
            status,
            ...(status === 'CANCELLED' ? { cancellationReason: reason } : {}),
          },
        });
      }
    } catch (dbErr) {
      console.warn('[driver/trips/status POST] DB update fallback:', dbErr);
    }

    return NextResponse.json({
      success: true,
      message: `Trip status updated to ${status}`,
      status,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update trip status' },
      { status: 400 }
    );
  }
}
