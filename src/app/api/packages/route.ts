import { NextResponse } from 'next/server';
import { DETAILED_PACKAGES } from '@/config/siteData';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: DETAILED_PACKAGES,
  });
}
