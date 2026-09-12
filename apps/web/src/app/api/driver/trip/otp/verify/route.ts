import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStoredBookingById, updateStoredBookingPartial, logTripAudit } from '@/lib/bookingStore';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const verifyOtpSchema = z.object({
  bookingId: z.string(),
  otp: z.string().min(4).max(6),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bookingId, otp } = verifyOtpSchema.parse(body);

    const booking = getStoredBookingById(bookingId);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const currentAttempts = (booking.otpAttempts || 0) + 1;

    // Retry limit check (max 5 attempts)
    if (currentAttempts > 5) {
      logTripAudit(bookingId, 'OTP_MAX_ATTEMPTS_EXCEEDED', 'DRIVER', { attempts: currentAttempts });
      return NextResponse.json(
        { error: 'Maximum OTP verification attempts exceeded. Please click "Request Admin Override".' },
        { status: 429 }
      );
    }

    // Verify OTP matching
    const validOtp = booking.pickupOtp || '1234';
    const isMatched = otp.trim() === validOtp || otp.trim() === '1234'; // allow fallback 1234 for testing

    if (!isMatched) {
      updateStoredBookingPartial(bookingId, { otpAttempts: currentAttempts });
      logTripAudit(bookingId, 'OTP_VERIFICATION_FAILED', 'DRIVER', { enteredOtp: otp, attempt: currentAttempts });
      return NextResponse.json(
        { error: `Incorrect OTP. Attempt ${currentAttempts} of 5. Please try again.` },
        { status: 400 }
      );
    }

    // OTP Verified successfully! Transition state to TRIP_STARTED / IN_PROGRESS
    const nowIso = new Date().toISOString();
    updateStoredBookingPartial(bookingId, {
      status: 'TRIP_STARTED',
      otpStatus: 'VERIFIED',
      otpVerifiedAt: nowIso,
      tripStartedAt: nowIso,
    });

    try {
      const found = await prisma.booking.findFirst({
        where: { OR: [{ id: bookingId }, { humanReadableRef: bookingId }] },
      });

      if (found) {
        await prisma.booking.update({
          where: { id: found.id },
          data: {
            status: 'TRIP_STARTED',
          },
        });

        await prisma.tripEvent.create({
          data: {
            bookingId: found.id,
            type: 'OTP_VERIFIED',
            payload: JSON.stringify({ verifiedAt: nowIso }),
          },
        }).catch(() => {});
      }
    } catch (dbErr) {
      console.warn('[trip/otp/verify POST] DB update fallback:', dbErr);
    }

    logTripAudit(bookingId, 'OTP_VERIFIED', 'DRIVER', { verifiedAt: nowIso });
    logTripAudit(bookingId, 'TRIP_IN_PROGRESS', 'DRIVER', { tripStartedAt: nowIso });

    return NextResponse.json({
      success: true,
      message: 'OTP verified! Trip is now IN PROGRESS.',
      status: 'TRIP_STARTED',
      bookingId,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'OTP verification failed' },
      { status: 400 }
    );
  }
}
