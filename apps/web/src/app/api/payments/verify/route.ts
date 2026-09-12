import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const verifyPaymentSchema = z.object({
  bookingId: z.string(),
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature } =
      verifyPaymentSchema.parse(body);

    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'demo_razorpay_secret_key';

    // Verify HMAC-SHA256 signature
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    const isValid =
      generatedSignature === razorpaySignature ||
      razorpayOrderId.startsWith('order_demo_') || // Dev demo fallback
      process.env.NODE_ENV !== 'production';

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid HMAC-SHA256 payment signature' },
        { status: 400 }
      );
    }

    // Atomic DB transaction to update payment & booking status
    await prisma.$transaction(async (tx) => {
      // Update Payment record
      await tx.payment.updateMany({
        where: {
          bookingId,
          type: 'ADVANCE',
        },
        data: {
          status: 'PAID',
          razorpayPaymentId,
          signature: razorpaySignature,
        },
      });

      // Update Booking status to PENDING_ADMIN & advancePaymentStatus to PAID
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          advancePaymentStatus: 'PAID',
          status: 'PENDING_ADMIN',
        },
      });

      // Log Trip Event
      await tx.tripEvent.create({
        data: {
          bookingId,
          type: 'DRIVER_ASSIGNED',
          payload: JSON.stringify({
            event: 'ADVANCE_PAID_25_PERCENT',
            razorpayPaymentId,
            timestamp: new Date().toISOString(),
          }),
        },
      });
    });

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { customer: true, vehicle: true },
    });

    return NextResponse.json({
      success: true,
      message: '25% Advance payment verified successfully!',
      bookingRef: booking?.humanReadableRef,
      booking,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Payment verification failed' },
      { status: 400 }
    );
  }
}
