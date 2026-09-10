import { NextResponse } from 'next/server';
import { verifyMobileOtp } from '@/lib/otpAuth';
import { getCustomerByMobile, updateCustomerLastLogin } from '@/lib/customerAccountEngine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mobile, otp } = body;

    if (!mobile || !otp) {
      return NextResponse.json({ error: 'Mobile and OTP code are required' }, { status: 400 });
    }

    const res = verifyMobileOtp(mobile, otp);
    if (!res.success) {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }

    const existingCustomer = getCustomerByMobile(mobile);
    const isNewCustomer = !existingCustomer || !existingCustomer.fullName || existingCustomer.fullName.trim() === '';

    if (existingCustomer) {
      updateCustomerLastLogin(mobile);
    }

    const userData = {
      ...res.user,
      fullName: existingCustomer?.fullName || '',
      customerId: existingCustomer?.customerId || res.user?.customerId,
    };

    // Set secure HTTP-only session cookie
    const response = NextResponse.json({
      success: true,
      token: res.token,
      user: userData,
      isNewCustomer,
    });

    response.cookies.set('kc_session', res.token || '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Failed to verify OTP' }, { status: 500 });
  }
}
