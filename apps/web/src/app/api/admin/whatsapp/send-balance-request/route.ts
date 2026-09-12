import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const balanceRequestSchema = z.object({
  bookingId: z.string(),
  tollAmount: z.number().optional().default(0),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bookingId, tollAmount } = balanceRequestSchema.parse(body);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { customer: { include: { user: true } } },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const updatedBalance = booking.balanceAmount + tollAmount;

    // Update toll amount on booking
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        tollAmount,
        balanceAmount: updatedBalance,
      },
    });

    const payloadSnapshot = {
      template: 'kandy_cabs_balance_payment_request',
      recipientPhone: booking.customer.user?.phone || '9876543210',
      parameters: {
        customerName: booking.customer.fullName,
        bookingRef: booking.humanReadableRef,
        advancePaid: booking.advanceAmount,
        tollAmount,
        remainingBalance: updatedBalance,
        gpayUpiQrImage: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=60',
      },
    };

    // Save WhatsApp Log
    const waMsg = await prisma.whatsAppMessage.create({
      data: {
        bookingId: booking.id,
        templateName: 'kandy_cabs_balance_payment_request',
        payloadSnapshot: JSON.stringify(payloadSnapshot),
        sentBy: 'ADMIN',
        status: 'SENT',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Balance payment request with GPay/UPI scanner sent via Meta WhatsApp Cloud API!',
      whatsAppMessageId: waMsg.id,
      remainingBalance: updatedBalance,
      payloadSnapshot,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'WhatsApp balance request failed' },
      { status: 400 }
    );
  }
}
