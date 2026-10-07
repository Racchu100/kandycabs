import { NextResponse } from 'next/server';
import { prisma } from '@kandy-cabs/db';
import { setCorsHeaders, handleOptions } from '@/lib/cors';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET() {
  try {
    const fleetCategories = await prisma.fleetCategory.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    const formatted = fleetCategories.map((f: any) => {
      const fuels: string[] = [];
      if (f.cngEnabled) fuels.push('CNG');
      if (f.petrolEnabled) fuels.push('PETROL');
      if (f.dieselEnabled) fuels.push('DIESEL');

      return {
        id: f.category,
        category: f.category,
        name: f.name,
        description: f.description,
        seatCount: f.seatCount,
        luggageCount: f.luggageCount,
        fuelTypes: fuels,
        hasCarrier: Boolean(f.hasCarrier),
        carrierCapacityText: f.carrierCapacityText || '',
        carrierExcludedCars: f.carrierExcludedCars || '',
        carrierExcludedReason: f.carrierExcludedReason || '',
        imageUrl: f.imageUrl,
        isActive: f.isActive,
      };
    });

    const res = NextResponse.json({ success: true, fleets: formatted });
    return setCorsHeaders(res);
  } catch (error: any) {
    console.error('Error fetching public fleet categories:', error);
    const res = NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch fleets' },
      { status: 500 }
    );
    return setCorsHeaders(res);
  }
}
