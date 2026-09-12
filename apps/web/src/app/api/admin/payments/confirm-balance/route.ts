import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const confirmBalanceSchema = z.object({
  bookingId: z.string(),
  confirmedByAdminId: z.string().optional().default('admin_ops'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bookingId, confirmedByAdminId } = confirmBalanceSchema.parse(body);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Create Payment record for balance
      await tx.payment.create({
        data: {
          bookingId,
          type: 'BALANCE',
          gateway: 'MANUAL_UPI',
          amount: booking.balanceAmount,
          status: 'PAID',
          confirmedByAdminId,
        },
      });

      // 2. Mark Booking balancePaymentStatus = PAID & status = TRIP_COMPLETED
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          balancePaymentStatus: 'PAID',
          status: 'TRIP_COMPLETED',
        },
      });

      // 3. Log Audit Trail
      await tx.auditLog.create({
        data: {
          actorId: confirmedByAdminId,
          action: 'MANUAL_UPI_BALANCE_PAID_CONFIRMED',
          entityType: 'BOOKING',
          entityId: bookingId,
          afterJson: JSON.stringify({
            balanceAmount: booking.balanceAmount,
            status: 'PAID',
            confirmedAt: new Date().toISOString(),
          }),
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Balance payment confirmed manually by admin! Booking marked completed.',
      bookingId,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to confirm balance payment' },
      { status: 400 }
    );
  }
}
