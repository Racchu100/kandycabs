import { NextResponse } from 'next/server';
import { pricingRepository } from '@/lib/pricingRepository';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rules = await pricingRepository.getAllRules();
    const history = await pricingRepository.getHistory();
    return NextResponse.json({ rules, history });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch pricing rules' }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      tripType,
      vehicleCategory,
      fuelType,
      airportRoute,
      includedKm,
      includedHours,
      basePrice,
      extraKmPrice,
      extraHourPrice,
      minimumFare,
      tollMode,
      parkingMode,
      nightCharge,
      waitingChargePerHour,
      driverAllowancePerDay,
      gstPercent,
      inclusions,
      exclusions,
      status,
    } = body;

    if (!tripType || !vehicleCategory || !fuelType || basePrice === undefined || includedKm === undefined || extraKmPrice === undefined) {
      return NextResponse.json({ error: 'Missing required pricing fields' }, { status: 400 });
    }

    const newRule = await pricingRepository.createRule({
      tripType,
      vehicleCategory,
      fuelType,
      airportRoute: airportRoute || '',
      includedKm: Number(includedKm),
      includedHours: includedHours ? Number(includedHours) : 0,
      basePrice: Number(basePrice),
      extraKmPrice: Number(extraKmPrice),
      extraHourPrice: extraHourPrice ? Number(extraHourPrice) : 0,
      minimumFare: minimumFare ? Number(minimumFare) : 0,
      tollMode: tollMode || 'EXTRA',
      parkingMode: parkingMode || 'EXTRA',
      nightCharge: Number(nightCharge || 0),
      waitingChargePerHour: Number(waitingChargePerHour || 0),
      driverAllowancePerDay: Number(driverAllowancePerDay || 0),
      gstPercent: Number(gstPercent !== undefined ? gstPercent : 5),
      inclusions: Array.isArray(inclusions)
        ? inclusions
        : typeof inclusions === 'string'
        ? inclusions.split('\n').map((s) => s.trim()).filter(Boolean)
        : [],
      exclusions: Array.isArray(exclusions)
        ? exclusions
        : typeof exclusions === 'string'
        ? exclusions.split('\n').map((s) => s.trim()).filter(Boolean)
        : [],
      status: status || 'ACTIVE',
    });

    const rules = await pricingRepository.getAllRules();
    return NextResponse.json({ success: true, rule: newRule, rules });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create pricing rule' }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 });
    }

    if (updates.inclusions && typeof updates.inclusions === 'string') {
      updates.inclusions = updates.inclusions.split('\n').map((s: string) => s.trim()).filter(Boolean);
    }
    if (updates.exclusions && typeof updates.exclusions === 'string') {
      updates.exclusions = updates.exclusions.split('\n').map((s: string) => s.trim()).filter(Boolean);
    }

    if (updates.includedKm) updates.includedKm = Number(updates.includedKm);
    if (updates.basePrice) updates.basePrice = Number(updates.basePrice);
    if (updates.extraKmPrice) updates.extraKmPrice = Number(updates.extraKmPrice);
    if (updates.includedHours) updates.includedHours = Number(updates.includedHours);
    if (updates.extraHourPrice) updates.extraHourPrice = Number(updates.extraHourPrice);
    if (updates.driverAllowancePerDay) updates.driverAllowancePerDay = Number(updates.driverAllowancePerDay);
    if (updates.gstPercent !== undefined) updates.gstPercent = Number(updates.gstPercent);

    const updated = await pricingRepository.updateRule(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Pricing rule not found' }, { status: 404 });
    }

    const rules = await pricingRepository.getAllRules();
    return NextResponse.json({ success: true, rule: updated, rules });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update pricing rule' }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 });
    }

    const deleted = await pricingRepository.deleteRule(id);
    const rules = await pricingRepository.getAllRules();
    return NextResponse.json({ success: deleted, rules });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete pricing rule' }, { status: 400 });
  }
}
