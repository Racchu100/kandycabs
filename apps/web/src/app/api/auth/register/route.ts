import { NextResponse } from 'next/server';
import { saveUser } from '@/lib/userStore';
import { signToken } from '@/lib/jwt';
import { normalizePhone } from '@kandycabs/shared';
import { z } from 'zod';

const registerSchema = z.object({
  phone: z.string().min(10),
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email().optional().or(z.literal('')),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, fullName, email } = registerSchema.parse(body);
    const last10 = normalizePhone(phone);

    const savedUser = await saveUser(last10, fullName, email);

    const tokenPayload = {
      userId: savedUser.id,
      phone: savedUser.phone,
      fullName: savedUser.fullName,
      roles: savedUser.roles,
    };

    const token = signToken(tokenPayload);

    const response = NextResponse.json({
      success: true,
      user: savedUser,
      token,
      message: `Welcome to Kandy Cabs, ${fullName}!`,
    });

    response.cookies.set('kandy_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Registration failed' },
      { status: 400 }
    );
  }
}
