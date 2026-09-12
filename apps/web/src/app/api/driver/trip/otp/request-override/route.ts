import { NextResponse } from 'next/server';
import { getStoredBookingById, updateStoredBookingPartial, logTripAudit } from '@/lib/bookingStore';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const overrideRequestSchema = z.object({
  bookingId: z.string(),
  reason: z.string().optional().default('Customer unable to receive OTP'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bookingId, reason } = overrideRequestSchema.parse(body);

    const booking = getStoredBookingById(bookingId);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.status === 'TRIP_STARTED' || booking.status === 'TRIP_COMPLETED') {
      return NextResponse.json(
        { error: `Trip is already in state ${booking.status}` },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    const finalReason = reason || 'Customer OTP not received';

    updateStoredBookingPartial(bookingId, {
      otpStatus: 'ADMIN_OVERRIDE_REQUESTED',
      overrideReason: finalReason,
      adminReason: finalReason,
    });

    logTripAudit(bookingId, 'ADMIN_OVERRIDE_REQUESTED', 'DRIVER', {
      reason: finalReason,
      requestedAt: nowIso,
    });

    return NextResponse.json({
      success: true,
      message: 'Admin has been notified. Please wait for trip authorization.',
      status: 'ADMIN_OVERRIDE_REQUESTED',
      otpStatus: 'ADMIN_OVERRIDE_REQUESTED',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to request admin override' },
      { status: 400 }
    );
  }
}
