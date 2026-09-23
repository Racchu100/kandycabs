import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@kandy-cabs/db';
import { BookingStatus } from '@kandy-cabs/shared';
import { getAdminSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAdminSession(req);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Admin privileges required' },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await req.json();
    const { reason, targetStatus = BookingStatus.TRIP_STARTED } = body;

    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      return NextResponse.json(
        {
          success: false,
          message: 'A mandatory free-text reason (minimum 5 characters) is required for OTP override',
        },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, message: 'Booking not found' },
        { status: 404 }
      );
    }

    // Execute atomic OTP override transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Advance booking status to TRIP_STARTED (or target status)
      const updated = await tx.booking.update({
        where: { id },
        data: {
          status: targetStatus as BookingStatus,
        },
      });

      // 2. Insert TripEvent
      await tx.tripEvent.create({
        data: {
          bookingId: id,
          type: 'ADMIN_OTP_OVERRIDE',
          payloadJson: {
            actorUserId: session.userId,
            reason: reason.trim(),
            previousStatus: booking.status,
            newStatus: targetStatus,
            timestamp: new Date().toISOString(),
          },
        },
      });

      // 3. Insert AuditLog
      await tx.auditLog.create({
        data: {
          actorUserId: session.userId,
          action: 'ADMIN_OTP_OVERRIDE',
          entityType: 'Booking',
          entityId: id,
          reason: reason.trim(),
        },
      });

      return updated;
    });

    return NextResponse.json(
      {
        success: true,
        message: 'OTP overridden successfully. Trip status updated.',
        booking: result,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error in POST /api/admin/bookings/[id]/otp-override:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to execute OTP override' },
      { status: 500 }
    );
  }
}
