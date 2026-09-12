import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStoredBookingById, updateStoredBookingPartial, logTripAudit } from '@/lib/bookingStore';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const adminOverrideSchema = z.object({
  adminId: z.string().optional().default('ADMIN'),
  reason: z.string().min(2, 'Override reason is required'),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { adminId, reason } = adminOverrideSchema.parse(body);
    const bookingId = params.id;

    const booking = getStoredBookingById(bookingId);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.status === 'TRIP_COMPLETED') {
      return NextResponse.json({ error: 'Trip is already COMPLETED' }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const finalReason = reason || 'Customer OTP not received';

    updateStoredBookingPartial(bookingId, {
      status: 'TRIP_STARTED',
      otpStatus: 'ADMIN_OVERRIDE',
      startedBy: 'ADMIN',
      adminId,
      adminReason: finalReason,
      adminStartedAt: nowIso,
      overrideByAdminId: adminId,
      overrideReason: finalReason,
      overrideTimestamp: nowIso,
      tripStartedAt: nowIso,
    });

    try {
      const found = await prisma.booking.findFirst({
        where: { OR: [{ id: bookingId }, { humanReadableRef: bookingId }] },
      });

      if (found) {
        await prisma.booking.update({
          where: { id: found.id },
          data: { status: 'TRIP_STARTED' },
        });

        await prisma.auditLog.create({
          data: {
            action: 'ADMIN_TRIP_AUTHORIZATION_APPROVED',
            actorId: adminId,
            entityType: 'BOOKING',
            entityId: found.id,
            afterJson: JSON.stringify({
              otpStatus: 'ADMIN_OVERRIDE',
              startedBy: 'ADMIN',
              adminId,
              adminReason: finalReason,
              adminStartedAt: nowIso,
            }),
          },
        }).catch(() => {});
      }
    } catch (dbErr) {
      console.warn('[admin/otp-override POST] DB update fallback:', dbErr);
    }

    logTripAudit(bookingId, 'ADMIN_TRIP_AUTHORIZATION_APPROVED', adminId, {
      otpStatus: 'ADMIN_OVERRIDE',
      startedBy: 'ADMIN',
      adminId,
      reason: finalReason,
      adminStartedAt: nowIso,
    });
    logTripAudit(bookingId, 'TRIP_IN_PROGRESS', 'ADMIN', { tripStartedAt: nowIso });

    return NextResponse.json({
      success: true,
      message: '✓ Trip authorized by Admin! Status is now IN_PROGRESS.',
      status: 'TRIP_STARTED',
      otpStatus: 'ADMIN_OVERRIDE',
      startedBy: 'ADMIN',
      adminStartedAt: nowIso,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to process admin override' },
      { status: 400 }
    );
  }
}
