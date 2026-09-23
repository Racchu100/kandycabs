import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001';
  return NextResponse.redirect(adminUrl);
}
