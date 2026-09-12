import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStoredBookingById, updateStoredBookingPartial, logTripAudit } from '@/lib/bookingStore';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const endTripSchema = z.object({
  bookingId: z.string(),
  finalOdometer: z.number().nonnegative(),
  finalOdometerImagePath: z.string().min(1, 'Final odometer photo path is required'),
  tollFare: z.number().nonnegative().optional().default(0),
  endLat: z.number(),
  endLng: z.number(),
  endGpsAccuracy: z.number().optional(),
  gpsTimestamp: z.string().optional(),
  photoTimestamp: z.string().optional(),
  endLocation: z.string().optional().default('Destination Arrival'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bookingId, finalOdometer, finalOdometerImagePath, tollFare, endLat, endLng, endGpsAccuracy, gpsTimestamp, photoTimestamp, endLocation } =
      endTripSchema.parse(body);

    const booking = getStoredBookingById(bookingId);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const startKm = booking.startingOdometer || 0;

    // Validation: finalOdometer >= startingOdometer
    if (finalOdometer < startKm) {
      return NextResponse.json(
        { error: `Final odometer (${finalOdometer} KM) cannot be less than starting odometer (${startKm} KM)` },
        { status: 400 }
      );
    }

    const actualDistanceKm = finalOdometer - startKm;
    const toll = Math.max(0, tollFare || 0);
    const nowIso = new Date().toISOString();
    const newBalance = Math.max(0, (booking.balanceAmount || 0) + toll);

    updateStoredBookingPartial(bookingId, {
      status: 'TRIP_COMPLETED',
      finalOdometer,
      finalOdometerImagePath,
      endLat,
      endLng,
      endGpsAccuracy: endGpsAccuracy || undefined,
      endGpsTimestamp: gpsTimestamp || nowIso,
      photoTimestamp: photoTimestamp || nowIso,
      endLocation,
      endTimestamp: nowIso,
      tollAmount: toll,
      balanceAmount: newBalance,
      tripCompletedAt: nowIso,
      actualDistanceKm,
    });

    try {
      const found = await prisma.booking.findFirst({
        where: { OR: [{ id: bookingId }, { humanReadableRef: bookingId }] },
      });

      if (found) {
        await prisma.booking.update({
          where: { id: found.id },
          data: {
            status: 'TRIP_COMPLETED',
            tollAmount: toll,
            balanceAmount: newBalance,
          },
        });

        await prisma.tripEvent.create({
          data: {
            bookingId: found.id,
            type: 'TRIP_ENDED',
            payload: JSON.stringify({ finalOdometer, actualDistanceKm, toll, endLat, endLng, endLocation }),
          },
        }).catch(() => {});
      }
    } catch (dbErr) {
      console.warn('[trip/end POST] DB update fallback:', dbErr);
    }

    logTripAudit(bookingId, 'FINAL_ODOMETER_SUBMITTED', 'DRIVER', { finalOdometer, finalOdometerImagePath });
    logTripAudit(bookingId, 'TOLL_SUBMITTED', 'DRIVER', { tollFare: toll });
    logTripAudit(bookingId, 'TRIP_COMPLETED', 'DRIVER', { actualDistanceKm, completedAt: nowIso });

    return NextResponse.json({
      success: true,
      message: 'Trip ended & summary confirmed! Booking marked COMPLETED.',
      status: 'TRIP_COMPLETED',
      actualDistanceKm,
      tollAmount: toll,
      finalOdometer,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to complete trip' },
      { status: 400 }
    );
  }
}
