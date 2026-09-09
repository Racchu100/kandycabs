import { NextResponse } from 'next/server';
import { signToken, UserRole } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, phone, fullName, password, role = 'CUSTOMER' } = body;

    if (!email || !phone || !fullName || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const mockUserId = `user_${Date.now()}`;
    const mockCustomerId = `cust_${Date.now()}`;

    const token = signToken({
      userId: mockUserId,
      email,
      phone,
      role: role as UserRole,
      customerId: mockCustomerId,
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: mockUserId,
        email,
        phone,
        fullName,
        role,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
