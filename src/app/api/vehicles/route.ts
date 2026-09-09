import { NextResponse } from 'next/server';
import { DETAILED_VEHICLES } from '@/config/siteData';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: DETAILED_VEHICLES,
  });
}
