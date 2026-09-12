import { NextResponse } from 'next/server';
import { pricingRepository } from '@/lib/pricingRepository';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Rule ID is required to duplicate' }, { status: 400 });
    }

    const duplicated = await pricingRepository.duplicateRule(id);
    if (!duplicated) {
      return NextResponse.json({ error: 'Rule not found to duplicate' }, { status: 404 });
    }

    const rules = await pricingRepository.getAllRules();
    return NextResponse.json({ success: true, rule: duplicated, rules });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to duplicate rule' }, { status: 400 });
  }
}
