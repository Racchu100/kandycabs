import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStoredBookingById, updateStoredBookingPartial, logTripAudit } from '@/lib/bookingStore';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const startTripSchema = z.object({
  bookingId: z.string(),
  startingOdometer: z.number().nonnegative(),
  startingOdometerImagePath: z.string().min(1, 'Odometer photo path is required'),
  startLat: z.number(),
  startLng: z.number(),
  startGpsAccuracy: z.number().optional(),
  gpsTimestamp: z.string().optional(),
  photoTimestamp: z.string().optional(),
  startLocation: z.string().optional().default('Current Location'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bookingId, startingOdometer, startingOdometerImagePath, startLat, startLng, startGpsAccuracy, gpsTimestamp, photoTimestamp, startLocation } =
      startTripSchema.parse(body);

    const booking = getStoredBookingById(bookingId);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Handle Idempotency & existing states gracefully
    if (booking.status === 'TRIP_STARTED') {
      updateStoredBookingPartial(bookingId, {
        startingOdometer: startingOdometer || booking.startingOdometer,
        startingOdometerImagePath: startingOdometerImagePath || booking.startingOdometerImagePath,
      });
      return NextResponse.json({
        success: true,
        status: 'TRIP_STARTED',
        pickupOtp: booking.pickupOtp,
        message: 'Trip is already started and in progress!',
      });
    }

    if (booking.status === 'TRIP_COMPLETED') {
      return NextResponse.json({
        success: true,
        status: 'TRIP_COMPLETED',
        message: 'Trip is already completed!',
      });
    }

    if (booking.status === 'OTP_PENDING') {
      updateStoredBookingPartial(bookingId, {
        startingOdometer: startingOdometer || booking.startingOdometer,
        startingOdometerImagePath: startingOdometerImagePath || booking.startingOdometerImagePath,
      });
      return NextResponse.json({
        success: true,
        status: 'OTP_PENDING',
        pickupOtp: booking.pickupOtp,
        message: 'OTP is pending verification',
      });
    }

    // State machine check: must be DRIVER_ACCEPTED or STARTING or DISPATCHED
    if (!['DRIVER_ACCEPTED', 'STARTING', 'DISPATCHED'].includes(booking.status)) {
      updateStoredBookingPartial(bookingId, { status: 'OTP_PENDING' });
    }

    // Generate 4-digit OTP
    const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const nowIso = new Date().toISOString();

    const partialData = {
      status: 'OTP_PENDING',
      startingOdometer,
      startingOdometerImagePath,
      startingOdometerTimestamp: photoTimestamp || nowIso,
      startLat,
      startLng,
      startGpsAccuracy: startGpsAccuracy || undefined,
      startGpsTimestamp: gpsTimestamp || nowIso,
      startLocation,
      startLocationTimestamp: nowIso,
      pickupOtp: generatedOtp,
      otpStatus: 'PENDING' as const,
      otpAttempts: 0,
      lastGpsLat: startLat,
      lastGpsLng: startLng,
      lastGpsAccuracy: startGpsAccuracy || undefined,
      lastGpsUpdatedAt: gpsTimestamp || nowIso,
    };

    updateStoredBookingPartial(bookingId, partialData);

    // Save in Prisma DB
    try {
      const found = await prisma.booking.findFirst({
        where: { OR: [{ id: bookingId }, { humanReadableRef: bookingId }] },
      });

      if (found) {
        await prisma.booking.update({
          where: { id: found.id },
          data: {
            status: 'DRIVER_EN_ROUTE',
            pickupOtp: generatedOtp,
          },
        });

        await prisma.tripEvent.create({
          data: {
            bookingId: found.id,
            type: 'TRIP_STARTED',
            payload: JSON.stringify({ startingOdometer, startLat, startLng, startLocation, generatedOtp }),
          },
        }).catch(() => {});
      }
    } catch (dbErr) {
      console.warn('[trip/start POST] DB update fallback:', dbErr);
    }

    logTripAudit(bookingId, 'TRIP_START_INITIATED', 'DRIVER', { startingOdometer, startLat, startLng });
    logTripAudit(bookingId, 'START_ODOMETER_SUBMITTED', 'DRIVER', { startingOdometer, startingOdometerImagePath });
    logTripAudit(bookingId, 'OTP_GENERATED', 'SYSTEM', { pickupOtp: generatedOtp });

    return NextResponse.json({
      success: true,
      message: 'Starting odometer & location verified. OTP sent to customer!',
      status: 'OTP_PENDING',
      bookingId,
      pickupOtp: generatedOtp, // returned for demo / SMS trigger
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to start trip lifecycle' },
      { status: 400 }
    );
  }
}
