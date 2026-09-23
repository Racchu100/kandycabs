import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@kandy-cabs/db';
import { VehicleCategory, VEHICLE_RATES, FuelType } from '@kandy-cabs/shared';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let fleetCategories = await prisma.fleetCategory.findMany({
      orderBy: { createdAt: 'asc' },
    });

    // If database table is empty, seed defaults from VEHICLE_RATES
    if (fleetCategories.length === 0) {
      const defaults = Object.values(VehicleCategory).map((cat) => {
        const conf = VEHICLE_RATES[cat];
        return {
          category: cat,
          name: conf.name,
          description: conf.description,
          seatCount: conf.seats,
          luggageCount: conf.luggage,
          cngRate: conf.perKmRate[FuelType.CNG] || 11.0,
          cngEnabled: true,
          petrolRate: conf.perKmRate[FuelType.PETROL] || 12.0,
          petrolEnabled: true,
          dieselRate: conf.perKmRate[FuelType.DIESEL] || 13.0,
          dieselEnabled: true,
          extraKmRate: conf.extraKmRate,
          driverAllowance: conf.driverAllowancePerDay,
          nightCharge: conf.nightCharge,
          minRoundTripKmPerDay: conf.minRoundTripKmPerDay,
          localPackage4hrBase: conf.localPackages?.[0]?.basePrice || 1200,
          localPackage8hrBase: conf.localPackages?.[1]?.basePrice || 2200,
          isActive: true,
        };
      });

      for (const d of defaults) {
        await prisma.fleetCategory.upsert({
          where: { category: d.category },
          update: {},
          create: d,
        });
      }

      fleetCategories = await prisma.fleetCategory.findMany({
        orderBy: { createdAt: 'asc' },
      });
    }

    const formatted = fleetCategories.map((f: any) => ({
      id: f.id,
      category: f.category,
      name: f.name,
      description: f.description,
      seatCount: f.seatCount,
      luggageCount: f.luggageCount,
      cngRate: Number(f.cngRate),
      cngEnabled: f.cngEnabled ?? true,
      petrolRate: Number(f.petrolRate),
      petrolEnabled: f.petrolEnabled ?? true,
      dieselRate: Number(f.dieselRate),
      dieselEnabled: f.dieselEnabled ?? true,
      extraKmRate: Number(f.extraKmRate),
      driverAllowance: Number(f.driverAllowance),
      nightCharge: Number(f.nightCharge),
      minRoundTripKmPerDay: f.minRoundTripKmPerDay,
      localPackage4hrBase: Number(f.localPackage4hrBase ?? 1200),
      localPackage8hrBase: Number(f.localPackage8hrBase ?? 2200),
      imageUrl: f.imageUrl,
      isActive: f.isActive,
    }));

    return NextResponse.json({ success: true, fleets: formatted });
  } catch (error: any) {
    console.error('Error fetching fleet categories:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch fleet categories' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      category,
      name,
      description,
      seatCount = 4,
      luggageCount = 2,
      cngRate = 12,
      cngEnabled = true,
      petrolRate = 13,
      petrolEnabled = true,
      dieselRate = 14,
      dieselEnabled = true,
      extraKmRate = 15,
      driverAllowance = 350,
      nightCharge = 250,
      minRoundTripKmPerDay = 250,
      localPackage4hrBase = 1200,
      localPackage8hrBase = 2200,
      imageUrl,
      isActive = true,
    } = body;

    const fleet = await prisma.fleetCategory.upsert({
      where: { category },
      update: {
        name,
        description,
        seatCount: Number(seatCount),
        luggageCount: Number(luggageCount),
        cngRate: Number(cngRate),
        cngEnabled: Boolean(cngEnabled),
        petrolRate: Number(petrolRate),
        petrolEnabled: Boolean(petrolEnabled),
        dieselRate: Number(dieselRate),
        dieselEnabled: Boolean(dieselEnabled),
        extraKmRate: Number(extraKmRate),
        driverAllowance: Number(driverAllowance),
        nightCharge: Number(nightCharge),
        minRoundTripKmPerDay: Number(minRoundTripKmPerDay),
        localPackage4hrBase: Number(localPackage4hrBase),
        localPackage8hrBase: Number(localPackage8hrBase),
        imageUrl,
        isActive: Boolean(isActive),
      },
      create: {
        category,
        name,
        description,
        seatCount: Number(seatCount),
        luggageCount: Number(luggageCount),
        cngRate: Number(cngRate),
        cngEnabled: Boolean(cngEnabled),
        petrolRate: Number(petrolRate),
        petrolEnabled: Boolean(petrolEnabled),
        dieselRate: Number(dieselRate),
        dieselEnabled: Boolean(dieselEnabled),
        extraKmRate: Number(extraKmRate),
        driverAllowance: Number(driverAllowance),
        nightCharge: Number(nightCharge),
        minRoundTripKmPerDay: Number(minRoundTripKmPerDay),
        localPackage4hrBase: Number(localPackage4hrBase),
        localPackage8hrBase: Number(localPackage8hrBase),
        imageUrl,
        isActive: Boolean(isActive),
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'FLEET_CATEGORY_UPDATED',
        entityType: 'FleetCategory',
        entityId: fleet.id,
        reason: `Admin configured fleet rates for ${category}`,
      },
    });

    return NextResponse.json({ success: true, fleet });
  } catch (error: any) {
    console.error('Error saving fleet category:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save fleet category' },
      { status: 500 }
    );
  }
}
