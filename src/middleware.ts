import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect Admin Dashboard Route
  if (pathname.startsWith('/admin/dashboard')) {
    const adminSession = request.cookies.get('kc_admin_session')?.value;
    const generalSession = request.cookies.get('kc_session')?.value;

    // Strict validation: Require active admin session
    if (!adminSession && !generalSession?.includes('admin_token')) {
      const loginUrl = new URL('/admin', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Protect Driver Dashboard Route
  if (pathname.startsWith('/driver/dashboard')) {
    const sessionCookie = request.cookies.get('kc_session')?.value;
    const driverToken = request.cookies.get('kc_driver_token')?.value;

    if (!sessionCookie && !driverToken) {
      // Unauthenticated access to driver dashboard -> Redirect to Driver OTP Login
      const loginUrl = new URL('/driver/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/dashboard/:path*', '/driver/dashboard/:path*'],
};
