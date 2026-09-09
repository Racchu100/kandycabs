import { NextResponse } from 'next/server';
import { signToken, UserRole } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const mockRole: UserRole = email.includes('admin')
      ? 'ADMIN'
      : email.includes('driver')
      ? 'DRIVER'
      : 'CUSTOMER';

    const mockUserId = `user_${Date.now()}`;
    const token = signToken({
      userId: mockUserId,
      email,
      phone: '+919900887777',
      role: mockRole,
      customerId: mockRole === 'CUSTOMER' ? `cust_${Date.now()}` : undefined,
      driverId: mockRole === 'DRIVER' ? `driver_${Date.now()}` : undefined,
      adminId: mockRole === 'ADMIN' ? `admin_${Date.now()}` : undefined,
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: mockUserId,
        email,
        role: mockRole,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
