import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const locationPingSchema = z.object({
  driverId: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speedKmh: z.number().min(0),
  headingDegrees: z.number().optional(),
  accuracy: z.number().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const input = locationPingSchema.parse(body);

    const clampedSpeed = Math.min(160, Math.max(0, input.speedKmh));

    const trackingPing = await prisma.tripTracking.create({
      data: {
        bookingId: params.id,
        driverId: input.driverId,
        latitude: input.latitude,
        longitude: input.longitude,
        speedKmh: clampedSpeed,
        headingDegrees: input.headingDegrees || null,
        accuracy: input.accuracy || null,
        recordedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      pingId: trackingPing.id,
      recordedAt: trackingPing.recordedAt,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Location ping failed' },
      { status: 400 }
    );
  }
}
