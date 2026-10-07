import { NextResponse } from 'next/server';
import { setCorsHeaders, handleOptions } from '@/lib/cors';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST() {
  const response = NextResponse.json(
    { success: true, message: 'Logged out successfully' },
    { status: 200 }
  );

  // Clear cookie safely
  if (response.cookies && typeof response.cookies.set === 'function') {
    response.cookies.set({
      name: 'kandy_session',
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
  } else {
    response.headers.set(
      'Set-Cookie',
      `kandy_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${
        process.env.NODE_ENV === 'production' ? '; Secure' : ''
      }`
    );
  }

  return setCorsHeaders(response);
}
