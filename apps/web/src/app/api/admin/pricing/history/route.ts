import { NextResponse } from 'next/server';
import { pricingRepository } from '@/lib/pricingRepository';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const history = await pricingRepository.getHistory();
    return NextResponse.json({ history });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch pricing history' }, { status: 400 });
  }
}
