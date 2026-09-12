import { NextResponse } from 'next/server';
import { getStoredBookingById, updateStoredBookingPartial, logTripAudit } from '@/lib/bookingStore';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const resendOtpSchema = z.object({
  bookingId: z.string(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bookingId } = resendOtpSchema.parse(body);

    const booking = getStoredBookingById(bookingId);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const newOtp = Math.floor(1000 + Math.random() * 9000).toString();
    updateStoredBookingPartial(bookingId, {
      pickupOtp: newOtp,
      otpAttempts: 0,
    });

    logTripAudit(bookingId, 'OTP_RESENT', 'DRIVER', { newOtp });

    return NextResponse.json({
      success: true,
      message: 'New OTP sent to customer!',
      pickupOtp: newOtp,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to resend OTP' },
      { status: 400 }
    );
  }
}
