import { NextRequest, NextResponse } from 'next/server';
import {
  VehicleCategory,
  FuelType,
  TripType,
  calculateFare,
  VEHICLE_RATES,
  QuoteRequest,
  QuoteResponse,
} from '@kandy-cabs/shared';
import { prisma } from '@kandy-cabs/db';
import { calculateRouteDistance, calculateMultiPointRouteDistance } from '@/lib/distance';
import { setCorsHeaders, handleOptions } from '@/lib/cors';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return handleOptions();
}

// In-Memory Database Cache for Pricing Rules & Fleet (60s TTL)
interface DbPricingCache {
  rules: any[];
  fleet: any[];
  expiresAt: number;
}

let dbPricingCache: DbPricingCache | null = null;
const DB_PRICING_CACHE_TTL_MS = 60 * 1000; // 60s

async function getCachedPricingData() {
  const now = Date.now();
  if (dbPricingCache && now < dbPricingCache.expiresAt) {
    return { rules: dbPricingCache.rules, fleet: dbPricingCache.fleet };
  }

  const [dbPricingRules, dbFleetCategories] = await Promise.all([
    prisma.pricingRule.findMany({ where: { isActive: true } }).catch(() => []),
    prisma.fleetCategory.findMany({ where: { isActive: true } }).catch(() => []),
  ]);

  dbPricingCache = {
    rules: dbPricingRules,
    fleet: dbFleetCategories,
    expiresAt: now + DB_PRICING_CACHE_TTL_MS,
  };

  return { rules: dbPricingRules, fleet: dbFleetCategories };
}

export async function POST(req: NextRequest) {
  try {
    const body: QuoteRequest = await req.json();
    const {
      pickupLat,
      pickupLng,
      dropLat,
      dropLng,
      stops = [],
      tripType = TripType.ONEWAY,
      scheduledAt = new Date().toISOString(),
      durationDays = 1,
      packageHours = 8,
      category,
      fuelType,
      couponCode,
    } = body;

    // 1. Calculate server-authoritative distance (never trust client)
    let distanceKm = 50; // default for local
    let durationMins = 60;

    if (
      typeof pickupLat === 'number' &&
      typeof pickupLng === 'number' &&
      typeof dropLat === 'number' &&
      typeof dropLng === 'number'
    ) {
      if (tripType === TripType.ROUND) {
        // Construct waypoint path: Pickup -> Stop 1 -> Stop 2 -> Drop -> Pickup (return)
        const waypoints: { lat: number; lng: number }[] = [{ lat: pickupLat, lng: pickupLng }];
        if (Array.isArray(stops) && stops.length > 0) {
          for (const s of stops) {
            if (typeof s.lat === 'number' && typeof s.lng === 'number') {
              waypoints.push({ lat: s.lat, lng: s.lng });
            }
          }
        }
        waypoints.push({ lat: dropLat, lng: dropLng });
        // Return leg to pickup
        waypoints.push({ lat: pickupLat, lng: pickupLng });

        const route = await calculateMultiPointRouteDistance(waypoints);
        distanceKm = route.distanceKm;
        durationMins = route.durationMins;
      } else {
        const route = await calculateRouteDistance(pickupLat, pickupLng, dropLat, dropLng);
        distanceKm = route.distanceKm;
        durationMins = route.durationMins;
      }
    }

    // 2. Load dynamic pricing rules & fleet categories from in-memory cached database snapshot
    const { rules: dbPricingRules, fleet: dbFleetCategories } = await getCachedPricingData();

    const fleetMap = new Map<string, any>();
    for (const f of dbFleetCategories) {
      fleetMap.set(f.category, f);
    }

    const pricingRuleMap = new Map<string, any>();
    for (const r of dbPricingRules) {
      const key = `${r.category}_${r.tripType}_${r.fuelType}`;
      pricingRuleMap.set(key, r);
    }

    // 3. Compute quotes for categories
    const categoriesToQuote = category
      ? [category]
      : [
          VehicleCategory.HATCHBACK,
          VehicleCategory.SEDAN,
          VehicleCategory.SUV,
          VehicleCategory.SUV_PREMIUM,
          VehicleCategory.TEMPO_TRAVELER,
        ];

    const quotes = categoriesToQuote.map((cat) => {
      const config = VEHICLE_RATES[cat] || VEHICLE_RATES[VehicleCategory.SEDAN];
      const dbFleet = fleetMap.get(cat);

      // Determine available & enabled fuels for this category
      const candidateFuels = [
        {
          fuelType: FuelType.CNG,
          isEnabled: dbFleet ? dbFleet.cngEnabled !== false && Number(dbFleet.cngRate) > 0 : true,
          rate: dbFleet ? Number(dbFleet.cngRate) : config.perKmRate[FuelType.CNG] || 11.0,
        },
        {
          fuelType: FuelType.PETROL,
          isEnabled: dbFleet ? dbFleet.petrolEnabled !== false && Number(dbFleet.petrolRate) > 0 : true,
          rate: dbFleet ? Number(dbFleet.petrolRate) : config.perKmRate[FuelType.PETROL] || 12.0,
        },
        {
          fuelType: FuelType.DIESEL,
          isEnabled: dbFleet ? dbFleet.dieselEnabled !== false && Number(dbFleet.dieselRate) > 0 : true,
          rate: dbFleet ? Number(dbFleet.dieselRate) : config.perKmRate[FuelType.DIESEL] || 13.0,
        },
      ];

      // Calculate pricing for each enabled candidate fuel
      const fuelOptions = candidateFuels
        .filter((f) => f.isEnabled)
        .map((f) => {
          const dbRuleKey = `${cat}_${tripType}_${f.fuelType}`;
          const dbRule = pricingRuleMap.get(dbRuleKey);

          const overrides: any = {
            ratePerKm: dbRule ? Number(dbRule.baseRatePerKm) : f.rate,
            extraKmRate: dbRule ? Number(dbRule.extraKmRate) : dbFleet ? Number(dbFleet.extraKmRate) : undefined,
            driverAllowance: dbRule ? Number(dbRule.driverAllowance) : dbFleet ? Number(dbFleet.driverAllowance) : undefined,
            nightCharge: dbRule ? Number(dbRule.nightCharge) : dbFleet ? Number(dbFleet.nightCharge) : undefined,
            gstRatePercent: dbRule ? Number(dbRule.gstRatePercent) : undefined,
            nightWindowStartHour: dbRule ? dbRule.nightWindowStartHour : undefined,
            nightWindowEndHour: dbRule ? dbRule.nightWindowEndHour : undefined,
            minRoundTripKmPerDay: dbFleet ? Number(dbFleet.minRoundTripKmPerDay) : undefined,
            localPackage4hrBase: dbFleet?.localPackage4hrBase ? Number(dbFleet.localPackage4hrBase) : undefined,
            localPackage8hrBase: dbFleet?.localPackage8hrBase ? Number(dbFleet.localPackage8hrBase) : undefined,
          };

          const pricing = calculateFare({
            category: cat,
            fuelType: f.fuelType,
            tripType,
            distanceKm,
            scheduledAt,
            durationDays,
            packageHours,
            couponCode,
            overrides,
          });

          return {
            fuelType: f.fuelType,
            ratePerKm: f.rate,
            pricing,
            isEnabled: true,
          };
        });

      // Selected fuel option (match requested fuelType or fallback to first available)
      const selectedOption =
        (fuelType && fuelOptions.find((fo) => fo.fuelType === fuelType)) ||
        fuelOptions.find((fo) => fo.fuelType === (cat === VehicleCategory.HATCHBACK ? FuelType.PETROL : FuelType.DIESEL)) ||
        fuelOptions[0] || {
          fuelType: FuelType.DIESEL,
          ratePerKm: 14.0,
          pricing: calculateFare({
            category: cat,
            tripType,
            distanceKm,
            scheduledAt,
            durationDays,
            packageHours,
            couponCode,
          }),
          isEnabled: true,
        };

      return {
        category: cat,
        name: dbFleet?.name || config.name,
        description: dbFleet?.description || config.description,
        seats: dbFleet?.seatCount || config.seats,
        luggage: dbFleet?.luggageCount || config.luggage,
        fuelTypes: fuelOptions.map((fo) => fo.fuelType),
        pricing: selectedOption.pricing,
        fuelOptions,
      };
    });

    const responsePayload: QuoteResponse = {
      success: true,
      distanceKm,
      estimatedDurationMins: durationMins,
      quotes,
    };

    const res = NextResponse.json(responsePayload, { status: 200 });
    return setCorsHeaders(res);
  } catch (error: any) {
    console.error('Error in POST /api/pricing/quote:', error);
    const res = NextResponse.json(
      { success: false, message: error.message || 'Failed to compute fare quote' },
      { status: 500 }
    );
    return setCorsHeaders(res);
  }
}
