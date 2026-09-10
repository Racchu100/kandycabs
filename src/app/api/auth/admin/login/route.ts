import { NextResponse } from 'next/server';
import { signToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    const validUsername = process.env.ADMIN_USERNAME || 'kandycabs';
    const validPassword = process.env.ADMIN_PASSWORD || 'kandycabs123';

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and Password are required.' }, { status: 400 });
    }

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (cleanUser !== validUsername.toLowerCase() && cleanUser !== '9481086058') {
      return NextResponse.json({ error: 'Invalid admin username or passcode.' }, { status: 401 });
    }

    if (cleanPass !== validPassword) {
      return NextResponse.json({ error: 'Incorrect admin password.' }, { status: 401 });
    }

    const adminId = 'admin_super';
    const token = signToken({
      userId: adminId,
      adminId,
      email: 'admin@kandycabs.in',
      phone: '9481086058',
      role: 'ADMIN',
    });

    const adminUser = {
      id: adminId,
      name: 'Super Admin',
      username: validUsername,
      role: 'ADMIN',
      canBookRides: true,
      canManageAdmin: true,
    };

    const response = NextResponse.json({
      success: true,
      token,
      user: adminUser,
    });

    response.cookies.set('kc_admin_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Admin authentication failed.' }, { status: 500 });
  }
}
