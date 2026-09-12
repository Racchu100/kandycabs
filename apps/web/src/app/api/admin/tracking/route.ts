import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAllStoredBookings, getTripGpsPoints, getKnownLocationName } from '@/lib/bookingStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let dbBookings: any[] = [];
    try {
      dbBookings = await prisma.booking.findMany({
        where: {
          status: {
            in: ['TRIP_STARTED', 'OTP_PENDING', 'STARTING', 'DRIVER_ACCEPTED', 'DISPATCHED'] as any,
          },
        },
        include: {
          customer: { include: { user: true } },
          assignedDriver: { include: { user: true } },
          vehicle: true,
        },
        orderBy: { updatedAt: 'desc' },
      });
    } catch (dbErr) {
      console.warn('[admin/tracking GET] DB query fallback:', dbErr);
    }

    const storedBookings = getAllStoredBookings();
    const storedMap = new Map<string, any>();
    for (const s of storedBookings) {
      if (s.id) storedMap.set(s.id, s);
      if (s.humanReadableRef) storedMap.set(s.humanReadableRef, s);
    }

    const refSet = new Set<string>();
    const activeDrivers: any[] = [];
    const nowMs = Date.now();

    const activeStatuses = new Set(['TRIP_STARTED', 'OTP_PENDING', 'STARTING', 'DRIVER_ACCEPTED', 'DISPATCHED']);

    // Merge DB bookings + in-memory store
    for (const b of dbBookings) {
      refSet.add(b.humanReadableRef || b.id);
      const stored = storedMap.get(b.id) || storedMap.get(b.humanReadableRef);
      const currentStatus = stored?.status || b.status;

      if (!activeStatuses.has(currentStatus)) continue;

      const lastGpsLat = stored?.lastGpsLat ?? b.lastGpsLat ?? stored?.startLat ?? 12.8449;
      const lastGpsLng = stored?.lastGpsLng ?? b.lastGpsLng ?? stored?.startLng ?? 74.8498;
      const lastGpsAccuracy = stored?.lastGpsAccuracy ?? 8;
      const lastGpsSpeedKmh = stored?.lastGpsSpeedKmh ?? 0;
      const lastGpsLocationName = stored?.lastGpsLocationName || stored?.startLocation || getKnownLocationName(lastGpsLat, lastGpsLng);
      const lastGpsUpdatedAt = stored?.lastGpsUpdatedAt || stored?.tripStartedAt || b.updatedAt;

      // Status calculation based on last GPS timestamp
      let gpsStatus: 'LIVE' | 'GPS_DELAYED' | 'OFFLINE' = 'OFFLINE';
      if (lastGpsUpdatedAt) {
        const diffSec = (nowMs - new Date(lastGpsUpdatedAt).getTime()) / 1000;
        if (diffSec <= 30) {
          gpsStatus = 'LIVE';
        } else if (diffSec <= 120) {
          gpsStatus = 'GPS_DELAYED';
        } else {
          gpsStatus = 'OFFLINE';
        }
      }

      const points = getTripGpsPoints(b.id || b.humanReadableRef);

      activeDrivers.push({
        id: b.id,
        bookingId: b.id,
        humanReadableRef: b.humanReadableRef || b.id,
        status: currentStatus,
        gpsStatus,
        driver: {
          id: b.assignedDriver?.id || stored?.assignedDriver?.id || 'd_unassigned',
          fullName: b.assignedDriver?.fullName || stored?.assignedDriver?.fullName || 'Driver Partner',
          phone: b.assignedDriver?.user?.phone || stored?.assignedDriver?.user?.phone || stored?.assignedDriver?.phone || '8888888888',
        },
        vehicle: {
          name: b.vehicle?.name || stored?.vehicle?.name || 'Cab Vehicle',
          registrationNumber: b.vehicle?.registrationNumber || 'KA-19-KC-1234',
        },
        customer: {
          fullName: b.customer?.fullName || stored?.customer?.fullName || 'Customer',
          phone: b.customer?.user?.phone || stored?.customer?.user?.phone || stored?.customer?.phone || 'N/A',
        },
        pickupAddress: b.pickupAddress || stored?.pickupAddress || 'Pickup Point',
        dropAddress: b.dropAddress || stored?.dropAddress || 'Destination',
        latitude: lastGpsLat,
        longitude: lastGpsLng,
        accuracy: lastGpsAccuracy,
        speedKmh: lastGpsSpeedKmh,
        locationName: lastGpsLocationName,
        updatedAt: lastGpsUpdatedAt,
        routePoints: points.slice(-30),
      });
    }

    // Process stored bookings that were not in DB query result
    for (const s of storedBookings) {
      if (!refSet.has(s.humanReadableRef) && !refSet.has(s.id)) {
        if (!activeStatuses.has(s.status)) continue;
        refSet.add(s.humanReadableRef || s.id);

        const lastGpsLat = s.lastGpsLat ?? s.startLat ?? 12.8449;
        const lastGpsLng = s.lastGpsLng ?? s.startLng ?? 74.8498;
        const lastGpsAccuracy = s.lastGpsAccuracy ?? 8;
        const lastGpsSpeedKmh = s.lastGpsSpeedKmh ?? 0;
        const lastGpsLocationName = s.lastGpsLocationName || s.startLocation || getKnownLocationName(lastGpsLat, lastGpsLng);
        const lastGpsUpdatedAt = s.lastGpsUpdatedAt || s.tripStartedAt || s.createdAt;

        let gpsStatus: 'LIVE' | 'GPS_DELAYED' | 'OFFLINE' = 'OFFLINE';
        if (lastGpsUpdatedAt) {
          const diffSec = (nowMs - new Date(lastGpsUpdatedAt).getTime()) / 1000;
          if (diffSec <= 30) {
            gpsStatus = 'LIVE';
          } else if (diffSec <= 120) {
            gpsStatus = 'GPS_DELAYED';
          } else {
            gpsStatus = 'OFFLINE';
          }
        }

        const points = getTripGpsPoints(s.id || s.humanReadableRef);

        activeDrivers.push({
          id: s.id,
          bookingId: s.id,
          humanReadableRef: s.humanReadableRef || s.id,
          status: s.status,
          gpsStatus,
          driver: {
            id: s.assignedDriver?.id || 'd_unassigned',
            fullName: s.assignedDriver?.fullName || 'Driver Partner',
            phone: s.assignedDriver?.user?.phone || (s.assignedDriver as any)?.phone || '8888888888',
          },
          vehicle: {
            name: s.vehicle?.name || 'Cab Vehicle',
            registrationNumber: 'KA-19-KC-1234',
          },
          customer: {
            fullName: s.customer?.fullName || 'Customer',
            phone: s.customer?.user?.phone || s.customer?.phone || 'N/A',
          },
          pickupAddress: s.pickupAddress || 'Pickup Point',
          dropAddress: s.dropAddress || 'Destination',
          latitude: lastGpsLat,
          longitude: lastGpsLng,
          accuracy: lastGpsAccuracy,
          speedKmh: lastGpsSpeedKmh,
          locationName: lastGpsLocationName,
          updatedAt: lastGpsUpdatedAt,
          routePoints: points.slice(-30),
        });
      }
    }

    return NextResponse.json({ activeDrivers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch live tracking' }, { status: 400 });
  }
}
