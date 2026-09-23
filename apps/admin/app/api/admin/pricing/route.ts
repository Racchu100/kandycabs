import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@kandy-cabs/db';
import { VehicleCategory, TripType, FuelType, VEHICLE_RATES } from '@kandy-cabs/shared';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const tripType = searchParams.get('tripType');

    const whereClause: any = {};
    if (category && category !== 'ALL') whereClause.category = category;
    if (tripType && tripType !== 'ALL') whereClause.tripType = tripType;

    let rules = await prisma.pricingRule.findMany({
      where: whereClause,
      orderBy: [{ category: 'asc' }, { tripType: 'asc' }],
    });

    // If table is completely empty, seed standard rules
    if (rules.length === 0 && (!category || category === 'ALL') && (!tripType || tripType === 'ALL')) {
      const defaultRules: any[] = [];
      const categories = [
        VehicleCategory.HATCHBACK,
        VehicleCategory.SEDAN,
        VehicleCategory.SUV,
        VehicleCategory.SUV_PREMIUM,
        VehicleCategory.TEMPO_TRAVELER,
      ];
      const tripTypes = [TripType.ONEWAY, TripType.ROUND, TripType.AIRPORT, TripType.LOCAL];
      const fuelTypes = [FuelType.DIESEL, FuelType.PETROL, FuelType.CNG];

      for (const cat of categories) {
        const conf = VEHICLE_RATES[cat];
        for (const tt of tripTypes) {
          for (const ft of fuelTypes) {
            defaultRules.push({
              category: cat,
              tripType: tt,
              fuelType: ft,
              baseRatePerKm: conf.perKmRate[ft] || conf.perKmRate[FuelType.DIESEL] || 14.0,
              extraKmRate: conf.extraKmRate,
              driverAllowance: conf.driverAllowancePerDay,
              nightCharge: conf.nightCharge,
              gstRatePercent: 5.0,
              nightWindowStartHour: 22,
              nightWindowEndHour: 6,
              inclusions: ['Fuel charges', 'Driver fee', 'Standard GST'],
              exclusions: ['Tolls and parking', 'Inter-state permit taxes'],
              isActive: true,
            });
          }
        }
      }

      for (const r of defaultRules) {
        await prisma.pricingRule.upsert({
          where: {
            category_tripType_fuelType: {
              category: r.category,
              tripType: r.tripType,
              fuelType: r.fuelType,
            },
          },
          update: {},
          create: r,
        });
      }

      rules = await prisma.pricingRule.findMany({
        where: whereClause,
        orderBy: [{ category: 'asc' }, { tripType: 'asc' }],
      });
    }

    const formatted = rules.map((r) => ({
      id: r.id,
      category: r.category,
      tripType: r.tripType,
      fuelType: r.fuelType,
      baseRatePerKm: Number(r.baseRatePerKm),
      extraKmRate: Number(r.extraKmRate),
      driverAllowance: Number(r.driverAllowance),
      nightCharge: Number(r.nightCharge),
      gstRatePercent: Number(r.gstRatePercent),
      nightWindowStartHour: r.nightWindowStartHour,
      nightWindowEndHour: r.nightWindowEndHour,
      inclusions: r.inclusions,
      exclusions: r.exclusions,
      isActive: r.isActive,
    }));

    return NextResponse.json({ success: true, rules: formatted });
  } catch (error: any) {
    console.error('Error in GET /api/admin/pricing:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pricing rules' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      category,
      tripType,
      fuelType,
      baseRatePerKm,
      extraKmRate,
      driverAllowance,
      nightCharge,
      gstRatePercent = 5.0,
      nightWindowStartHour = 22,
      nightWindowEndHour = 6,
      inclusions = [],
      exclusions = [],
      isActive = true,
    } = body;

    const rule = await prisma.pricingRule.upsert({
      where: {
        category_tripType_fuelType: {
          category,
          tripType,
          fuelType,
        },
      },
      update: {
        baseRatePerKm,
        extraKmRate,
        driverAllowance,
        nightCharge,
        gstRatePercent,
        nightWindowStartHour: Number(nightWindowStartHour),
        nightWindowEndHour: Number(nightWindowEndHour),
        inclusions,
        exclusions,
        isActive,
      },
      create: {
        category,
        tripType,
        fuelType,
        baseRatePerKm,
        extraKmRate,
        driverAllowance,
        nightCharge,
        gstRatePercent,
        nightWindowStartHour: Number(nightWindowStartHour),
        nightWindowEndHour: Number(nightWindowEndHour),
        inclusions,
        exclusions,
        isActive,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'PRICING_RULE_SAVED',
        entityType: 'PricingRule',
        entityId: rule.id,
        reason: `Updated fare rule for ${category} × ${tripType} × ${fuelType}: Base ₹${baseRatePerKm}/km, Extra ₹${extraKmRate}/km`,
      },
    });

    return NextResponse.json({ success: true, rule });
  } catch (error: any) {
    console.error('Error saving pricing rule:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save pricing rule' },
      { status: 500 }
    );
  }
}
