import { NextResponse } from 'next/server';
import { createPaymentOrder } from '@/lib/paymentEngine';

export async function POST(request: Request) {
  try {
    const idempotencyKey =
      request.headers.get('idempotency-key') ||
      request.headers.get('x-idempotency-key');

    const body = await request.json();
    const { bookingId, amount } = body;

    if (!bookingId || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'bookingId and valid amount (number > 0) are required' },
        { status: 400 }
      );
    }

    const { order, isDemoMode } = createPaymentOrder(bookingId, amount, idempotencyKey || undefined);

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_demo_key';

    return NextResponse.json({
      success: true,
      order: {
        id: order.orderId,
        bookingId: order.bookingId,
        amount: order.amount,
        amountInPaise: order.amountInPaise,
        currency: order.currency,
        status: order.status,
      },
      keyId: razorpayKeyId,
      isDemoMode,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to create payment order' }, { status: 500 });
  }
}
