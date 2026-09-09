import { NextResponse } from 'next/server';
import { verifyWebhookSignature, verifyPaymentSignature } from '@/lib/paymentEngine';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature') || '';
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'demo_webhook_secret';

    const isValidSig = verifyWebhookSignature(rawBody, signature, webhookSecret);
    if (!isValidSig) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event;

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const payload = event.payload.payment.entity;
      const orderId = payload.order_id;
      const paymentId = payload.id;

      verifyPaymentSignature({
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: 'webhook_verified_signature',
      });
    }

    return NextResponse.json({ success: true, message: 'Webhook processed successfully' });
  } catch {
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 });
  }
}
