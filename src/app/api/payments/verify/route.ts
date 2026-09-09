import { NextResponse } from 'next/server';
import { verifyPaymentSignature } from '@/lib/paymentEngine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, bookingId } = body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json(
        { error: 'razorpayOrderId, razorpayPaymentId, and razorpaySignature are required' },
        { status: 400 }
      );
    }

    const verification = verifyPaymentSignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      bookingId,
    });

    if (!verification.verified) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          error: verification.error,
          paymentRecord: verification.paymentRecord,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      verified: true,
      message: 'Payment verified successfully by backend authoritative signature check.',
      paymentRecord: verification.paymentRecord,
      newBookingState: verification.newBookingState,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to verify payment signature' }, { status: 500 });
  }
}
