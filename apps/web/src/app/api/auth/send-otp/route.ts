import { NextResponse } from 'next/server';
import { getUserByPhone } from '@/lib/userStore';
import { normalizePhone } from '@kandycabs/shared';
import { z } from 'zod';

const sendOtpSchema = z.object({
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = sendOtpSchema.parse(body);
    const last10 = normalizePhone(parsed.phone);

    if (!last10 || last10.length !== 10) {
      return NextResponse.json(
        { error: 'Invalid 10-digit mobile number' },
        { status: 400 }
      );
    }

    const { isRegistered, user } = await getUserByPhone(last10);
    const fullName = user?.fullName || '';

    // Standard dev/demo OTP
    const devOtp = '1234';

    console.log(
      `[AUTH] Sent 4-digit SMS OTP to ${last10}: ${devOtp} (Registered: ${isRegistered}, Name: ${fullName})`
    );

    return NextResponse.json({
      success: true,
      isRegistered,
      fullName: fullName || undefined,
      message: `OTP sent to +91 ${last10}`,
      devOtp,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to send OTP' },
      { status: 400 }
    );
  }
}
