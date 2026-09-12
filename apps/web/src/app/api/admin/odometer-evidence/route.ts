import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAllStoredBookings } from '@/lib/bookingStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let dbBookings: any[] = [];
    try {
      dbBookings = await prisma.booking.findMany({
        include: {
          customer: { include: { user: true } },
          assignedDriver: { include: { user: true } },
          vehicle: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (dbErr) {
      console.warn('[odometer-evidence GET] DB fallback:', dbErr);
    }

    const storedBookings = getAllStoredBookings();
    // Build lookup map by id and humanReadableRef
    const storedMap = new Map<string, any>();
    for (const s of storedBookings) {
      if (s.id) storedMap.set(s.id, s);
      if (s.humanReadableRef) storedMap.set(s.humanReadableRef, s);
    }

    const refSet = new Set<string>();
    const entries: any[] = [];

    for (const b of dbBookings) {
      refSet.add(b.humanReadableRef || b.id);
      const stored = storedMap.get(b.id) || storedMap.get(b.humanReadableRef);
      entries.push({
        id: b.id,
        humanReadableRef: b.humanReadableRef,
        status: stored?.status || b.status,
        customerName: b.customer?.fullName || 'N/A',
        driverName: b.assignedDriver?.fullName || 'N/A',
        vehicleNumber: b.vehicle?.name || 'N/A',
        scheduledAt: b.scheduledAt,
        tripStartedAt: stored?.tripStartedAt || null,
        tripCompletedAt: stored?.tripCompletedAt || null,
        startingOdometer: stored?.startingOdometer ?? b.startingOdometer ?? null,
        startingOdometerImagePath: stored?.startingOdometerImagePath ?? b.startingOdometerImagePath ?? null,
        finalOdometer: stored?.finalOdometer ?? b.finalOdometer ?? null,
        finalOdometerImagePath: stored?.finalOdometerImagePath ?? b.finalOdometerImagePath ?? null,
        startLat: stored?.startLat ?? null,
        startLng: stored?.startLng ?? null,
        startLocation: stored?.startLocation ?? null,
        endLat: stored?.endLat ?? null,
        endLng: stored?.endLng ?? null,
        endLocation: stored?.endLocation ?? null,
        actualDistanceKm: stored?.actualDistanceKm ?? b.actualDistanceKm ?? null,
      });
    }

    for (const s of storedBookings) {
      if (!refSet.has(s.humanReadableRef) && !refSet.has(s.id)) {
        refSet.add(s.humanReadableRef || s.id);
        entries.push({
          id: s.id,
          humanReadableRef: s.humanReadableRef,
          status: s.status,
          customerName: s.customer?.fullName || 'N/A',
          driverName: s.assignedDriver?.fullName || 'N/A',
          vehicleNumber: s.vehicle?.name || 'N/A',
          scheduledAt: s.scheduledAt,
          tripStartedAt: s.tripStartedAt || null,
          tripCompletedAt: s.tripCompletedAt || null,
          startingOdometer: s.startingOdometer || null,
          startingOdometerImagePath: s.startingOdometerImagePath || null,
          finalOdometer: s.finalOdometer || null,
          finalOdometerImagePath: s.finalOdometerImagePath || null,
          startLat: s.startLat || null,
          startLng: s.startLng || null,
          startLocation: s.startLocation || null,
          endLat: s.endLat || null,
          endLng: s.endLng || null,
          endLocation: s.endLocation || null,
          actualDistanceKm: s.actualDistanceKm || null,
        });
      }
    }

    return NextResponse.json({ entries });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch odometer evidence' },
      { status: 400 }
    );
  }
}
