import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@kandy-cabs/db';
import { BookingStatus, PaymentStatus } from '@kandy-cabs/shared';

export const dynamic = 'force-dynamic';

/**
 * Razorpay Webhook Endpoint
 * 
 * Exclusively responsible for marking payments as PAID/verified.
 * Verifies HMAC SHA-256 signature using RAZORPAY_WEBHOOK_SECRET or RAZORPAY_KEY_SECRET.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    const webhookSecret =
      process.env.RAZORPAY_WEBHOOK_SECRET ||
      process.env.RAZORPAY_KEY_SECRET ||
      'mock_razorpay_secret_key_123';

    // Signature verification
    if (!signature) {
      console.warn('⚠️ Webhook received without x-razorpay-signature');
      return NextResponse.json({ error: 'Missing webhook signature' }, { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    // Timing-safe comparison to prevent timing attacks
    const signatureBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

    let isValid = false;
    if (signatureBuffer.length === expectedBuffer.length) {
      isValid = crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
    }

    if (!isValid) {
      console.error('❌ Invalid Razorpay webhook signature');
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const event = payload.event;
    console.log(`🔔 Received Razorpay webhook event: ${event}`);

    // Handle payment.captured or order.paid
    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload.payload?.payment?.entity;
      const orderEntity = payload.payload?.order?.entity;

      const orderId = paymentEntity?.order_id || orderEntity?.id;
      const paymentId = paymentEntity?.id;
      const amountPaise = paymentEntity?.amount || orderEntity?.amount;
      const amountRupees = amountPaise ? amountPaise / 100 : undefined;

      if (!orderId) {
        console.warn('⚠️ No order_id found in payment webhook payload');
        return NextResponse.json({ received: true, note: 'No order_id found' });
      }

      // Find matching payment record
      const paymentRecord = await prisma.payment.findFirst({
        where: { razorpayOrderId: orderId },
        include: { booking: true },
      });

      if (!paymentRecord) {
        console.warn(`⚠️ Payment record with razorpayOrderId=${orderId} not found in DB`);
        return NextResponse.json({ received: true, note: 'Payment record not found' });
      }

      // If already marked as paid, return idempotent success
      if (paymentRecord.status === PaymentStatus.PAID) {
        return NextResponse.json({
          received: true,
          message: 'Payment was already verified as PAID',
        });
      }

      // Atomically update Payment, Booking status, TripEvent, and AuditLog
      await prisma.$transaction(async (tx) => {
        // 1. Update Payment status
        await tx.payment.update({
          where: { id: paymentRecord.id },
          data: {
            status: PaymentStatus.PAID,
            razorpayPaymentId: paymentId || paymentRecord.razorpayPaymentId,
            paymentMethod: 'RAZORPAY',
            verifiedAt: new Date(),
          },
        });

        // 2. Update Booking status to PENDING_ADMIN and advance status to PAID
        await tx.booking.update({
          where: { id: paymentRecord.bookingId },
          data: {
            advancePaymentStatus: PaymentStatus.PAID,
            status: BookingStatus.PENDING_ADMIN,
          },
        });

        // 3. Insert TripEvent
        await tx.tripEvent.create({
          data: {
            bookingId: paymentRecord.bookingId,
            type: 'ADVANCE_PAYMENT_CAPTURED',
            payloadJson: {
              razorpayOrderId: orderId,
              razorpayPaymentId: paymentId,
              amount: amountRupees || Number(paymentRecord.amount),
              event,
              timestamp: new Date().toISOString(),
            },
          },
        });

        // 4. Record Audit Log
        await tx.auditLog.create({
          data: {
            action: 'PAYMENT_VERIFIED_WEBHOOK',
            entityType: 'Payment',
            entityId: paymentRecord.id,
            reason: `Webhook ${event} verified payment for booking ${paymentRecord.booking.humanReadableRef}. Razorpay Payment ID: ${paymentId}`,
          },
        });
      });

      console.log(`✅ Payment ${paymentRecord.id} verified and marked as PAID via webhook`);
      return NextResponse.json({
        success: true,
        received: true,
        bookingRef: paymentRecord.booking.humanReadableRef,
      });
    }

    // Default response for other unhandled events
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error processing Razorpay webhook:', error);
    return NextResponse.json(
      { error: error.message || 'Internal webhook error' },
      { status: 500 }
    );
  }
}
