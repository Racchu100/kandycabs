import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@kandy-cabs/db';

export const dynamic = 'force-dynamic';

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const thresholdPercent = parseFloat(searchParams.get('threshold') || '10');

    // Fetch bookings that have odometer records or are in active/completed state
    const bookings = await prisma.booking.findMany({
      where: {
        OR: [
          { startingOdometer: { not: null } },
          { finalOdometer: { not: null } },
          { status: 'TRIP_COMPLETED' },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        customer: {
          include: {
            user: { select: { fullName: true, phone: true } },
          },
        },
        assignedDriver: {
          include: {
            user: { select: { fullName: true, phone: true } },
            vehicles: { select: { plateNumber: true, category: true } },
          },
        },
        tripTrackings: {
          orderBy: { recordedAt: 'asc' },
          select: { lat: true, lng: true, recordedAt: true },
        },
      },
    });

    const items = bookings.map((b) => {
      // 1. Calculate GPS-derived distance by summing consecutive breadcrumb segments
      let gpsTrackedDistanceKm = 0;
      const trackings = b.tripTrackings || [];
      for (let i = 1; i < trackings.length; i++) {
        const seg = haversineKm(
          trackings[i - 1].lat,
          trackings[i - 1].lng,
          trackings[i].lat,
          trackings[i].lng
        );
        // Filter out extreme GPS jumps (> 150 km/h implied velocity)
        if (seg < 50) {
          gpsTrackedDistanceKm += seg;
        }
      }
      gpsTrackedDistanceKm = Math.round(gpsTrackedDistanceKm * 10) / 10;

      // 2. Calculate Odometer distance
      let odometerDistanceKm: number | null = null;
      if (b.startingOdometer !== null && b.finalOdometer !== null && b.finalOdometer >= b.startingOdometer) {
        odometerDistanceKm = Math.round((b.finalOdometer - b.startingOdometer) * 10) / 10;
      } else if (b.actualDistanceKm) {
        odometerDistanceKm = Math.round(b.actualDistanceKm * 10) / 10;
      }

      // 3. Compute discrepancy percentage
      let discrepancyPercent: number | null = null;
      let hasDiscrepancy = false;

      // Compare odometer vs GPS (or estimated if no GPS breadcrumbs yet)
      const referenceDistance = gpsTrackedDistanceKm > 0 ? gpsTrackedDistanceKm : b.distanceKm;

      if (odometerDistanceKm !== null && referenceDistance > 0) {
        const diff = Math.abs(odometerDistanceKm - referenceDistance);
        discrepancyPercent = Math.round((diff / referenceDistance) * 1000) / 10; // 1 decimal
        if (discrepancyPercent > thresholdPercent) {
          hasDiscrepancy = true;
        }
      }

      return {
        bookingId: b.id,
        humanReadableRef: b.humanReadableRef,
        customerName: b.customer?.user?.fullName || 'Customer',
        customerPhone: b.customer?.user?.phone || '',
        driverName: b.assignedDriver?.user?.fullName || 'Unassigned',
        driverPhone: b.assignedDriver?.user?.phone || '',
        vehiclePlate: b.assignedDriver?.vehicles?.[0]?.plateNumber || 'N/A',
        category: b.assignedDriver?.vehicles?.[0]?.category || 'SEDAN',
        scheduledAt: b.scheduledAt.toISOString(),
        tripType: b.tripType,
        pickupAddress: b.pickupAddress,
        dropAddress: b.dropAddress,
        pickupLat: b.pickupLat,
        pickupLng: b.pickupLng,
        dropLat: b.dropLat,
        dropLng: b.dropLng,
        startGpsLat: trackings[0]?.lat ?? b.pickupLat,
        startGpsLng: trackings[0]?.lng ?? b.pickupLng,
        finalGpsLat: trackings.length > 0 ? trackings[trackings.length - 1].lat : b.dropLat,
        finalGpsLng: trackings.length > 0 ? trackings[trackings.length - 1].lng : b.dropLng,
        driverCurrentLat: b.assignedDriver?.currentLat ?? null,
        driverCurrentLng: b.assignedDriver?.currentLng ?? null,
        driverLastPingAt: b.assignedDriver?.lastPingAt?.toISOString() ?? null,
        startingOdometer: b.startingOdometer,
        startingOdometerImagePath: b.startingOdometerImagePath,
        finalOdometer: b.finalOdometer,
        finalOdometerImagePath: b.finalOdometerImagePath,
        odometerDistanceKm,
        gpsTrackedDistanceKm: gpsTrackedDistanceKm > 0 ? gpsTrackedDistanceKm : null,
        breadcrumbPointsCount: trackings.length,
        estimatedDistanceKm: b.distanceKm,
        discrepancyPercent,
        hasDiscrepancy,
        status: b.status,
      };
    });

    return NextResponse.json({
      success: true,
      thresholdPercent,
      totalCount: items.length,
      discrepancyCount: items.filter((i) => i.hasDiscrepancy).length,
      items,
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/odometer-evidence:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch odometer audit data' },
      { status: 500 }
    );
  }
}
