import { NextResponse, NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Handle CORS for all API routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    const origin = request.headers.get('origin') || '*';

    // Handle preflight OPTIONS requests
    if (request.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 200 });
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      response.headers.set(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version'
      );
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Max-Age', '86400');
      return response;
    }

    // Process standard request and attach CORS headers to response
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version'
    );
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
