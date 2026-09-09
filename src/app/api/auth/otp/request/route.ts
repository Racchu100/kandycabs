import { NextResponse } from 'next/server';
import { requestMobileOtp } from '@/lib/otpAuth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mobile } = body;

    if (!mobile) {
      return NextResponse.json({ error: 'Mobile number is required' }, { status: 400 });
    }

    const res = requestMobileOtp(mobile);
    if (!res.success) {
      return NextResponse.json(
        { error: res.message, cooldownRemainingSec: res.cooldownRemainingSec },
        { status: 429 }
      );
    }

    return NextResponse.json({
      success: true,
      message: res.message,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to request OTP' }, { status: 500 });
  }
}
