import { NextResponse } from 'next/server';
import { validateCoupon } from '@/lib/couponEngine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, bookingAmount = 1000, customerId = 'guest', tripMode = 'ONEWAY' } = body;

    if (!code) {
      return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 });
    }

    const validation = validateCoupon({
      code,
      bookingAmount,
      customerId,
      tripMode,
    });

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          code: validation.code,
          discountAmount: 0,
          updatedFare: bookingAmount,
          reason: validation.reason,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      valid: true,
      code: validation.code,
      discountAmount: validation.discountAmount,
      updatedFare: validation.updatedFare,
    });
  } catch {
    return NextResponse.json({ error: 'Coupon validation service error' }, { status: 500 });
  }
}
