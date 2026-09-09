import { NextResponse } from 'next/server';
import { extractBearerToken, verifyToken } from '@/lib/auth';
import {
  getAllAdminPricingRules,
  updateAdminPricingRule,
  AdminPricingRule,
} from '@/lib/pricingConfigStore';

export async function GET(request: Request) {
  const token = extractBearerToken(request.headers.get('authorization'));
  const auth = verifyToken(token || '');

  if (!auth || (auth.role !== 'ADMIN' && auth.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const rules = getAllAdminPricingRules();
  return NextResponse.json({
    success: true,
    data: rules,
  });
}

export async function POST(request: Request) {
  try {
    const token = extractBearerToken(request.headers.get('authorization'));
    const auth = verifyToken(token || '');

    if (!auth || (auth.role !== 'ADMIN' && auth.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      id,
      vehicleCategory,
      tripMode,
      ratePerKm,
      minKm,
      minFare,
      driverAllowancePerDay,
      driverNightAllowance,
      airportSurcharge,
      gstRatePercent,
      waitingChargePerHour,
      advancePaymentPercent,
      tollInclusive,
    } = body as AdminPricingRule;

    if (!vehicleCategory || !tripMode || typeof ratePerKm !== 'number') {
      return NextResponse.json(
        { error: 'vehicleCategory, tripMode, and ratePerKm (number) are required' },
        { status: 400 }
      );
    }

    const updatedRule: AdminPricingRule = {
      id: id || `pr_${vehicleCategory}_${tripMode}`,
      vehicleCategory,
      tripMode,
      ratePerKm,
      minKm: minKm ?? 50,
      minFare: minFare ?? 700,
      driverAllowancePerDay: driverAllowancePerDay ?? 400,
      driverNightAllowance: driverNightAllowance ?? 250,
      airportSurcharge: airportSurcharge ?? 0,
      gstRatePercent: gstRatePercent ?? 5,
      waitingChargePerHour: waitingChargePerHour ?? 150,
      advancePaymentPercent: advancePaymentPercent ?? 25,
      tollInclusive: tollInclusive ?? false,
    };

    updateAdminPricingRule(updatedRule);

    return NextResponse.json({
      success: true,
      message: 'Admin pricing rule updated successfully',
      rule: updatedRule,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to update admin pricing rule' }, { status: 500 });
  }
}
