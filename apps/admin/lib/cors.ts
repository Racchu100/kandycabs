import { NextResponse } from 'next/server';

export function setCorsHeaders(res: NextResponse): NextResponse {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, Accept'
  );
  res.headers.set('Access-Control-Allow-Credentials', 'true');
  return res;
}

export function handleOptions() {
  const response = new NextResponse(null, { status: 204 });
  return setCorsHeaders(response);
}
