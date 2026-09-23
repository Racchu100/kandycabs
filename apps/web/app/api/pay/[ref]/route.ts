import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@kandy-cabs/db';
import { PaymentStatus, PaymentType } from '@kandy-cabs/shared';
import { setCorsHeaders, handleOptions } from '@/lib/cors';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  try {
    const { ref } = await params;
    if (!ref) {
      const res = NextResponse.json({ error: 'Booking reference is required' }, { status: 400 });
      return setCorsHeaders(res);
    }

    const booking = (await prisma.booking.findFirst({
      where: {
        OR: [
          { humanReadableRef: ref },
          { id: ref },
        ],
      },
      include: {
        customer: {
          include: {
            user: { select: { fullName: true, phone: true } },
          },
        },
        assignedDriver: {
          include: {
            user: { select: { fullName: true, phone: true } },
          },
        },
        payments: true,
      },
    })) as any;

    if (!booking) {
      const res = NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      return setCorsHeaders(res);
    }

    const advancePayment = booking.payments?.find((p: any) => p.type === PaymentType.ADVANCE);
    const balancePayment = booking.payments?.find((p: any) => p.type === PaymentType.BALANCE);

    const toll = booking.tollAmount ? Number(booking.tollAmount) : 0;
    const park = booking.parkingAmount ? Number(booking.parkingAmount) : 0;
    const driverAllowance = booking.driverAllowance ? Number(booking.driverAllowance) : 0;

    const res = NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        ref: booking.humanReadableRef,
        status: booking.status,
        tripType: booking.tripType,
        pickupAddress: booking.pickupAddress,
        dropAddress: booking.dropAddress,
        distanceKm: booking.distanceKm,
        actualDistanceKm: booking.actualDistanceKm,
        scheduledAt: booking.scheduledAt.toISOString(),
        customer: {
          name: booking.customer?.user?.fullName || 'Valued Customer',
          phone: booking.customer?.user?.phone || '',
        },
        driver: booking.assignedDriver
          ? {
              name: booking.assignedDriver.user.fullName,
              phone: booking.assignedDriver.user.phone,
              vehicleNumber: booking.assignedDriver.vehicleNumber,
              vehicleModel: booking.assignedDriver.vehicleModel,
            }
          : null,
        pricing: {
          estimatedFare: Number(booking.estimatedFare),
          advanceAmount: Number(booking.advanceAmount),
          advancePaymentStatus: booking.advancePaymentStatus,
          advancePaymentId: advancePayment?.razorpayPaymentId || null,
          advanceMethod: advancePayment?.paymentMethod || 'ONLINE',
          balanceAmount: Number(booking.balanceAmount),
          balancePaymentStatus: booking.balancePaymentStatus,
          balancePaymentId: balancePayment?.razorpayPaymentId || null,
          balanceMethod: balancePayment?.paymentMethod || null,
          balancePaidAt: balancePayment?.verifiedAt?.toISOString() || null,
          tollAmount: toll,
          parkingAmount: park,
          driverAllowance,
          totalPayable: Number(booking.estimatedFare) + toll + park + driverAllowance,
        },
      },
    });

    return setCorsHeaders(res);
  } catch (error: any) {
    console.error('Error fetching public booking invoice:', error);
    const res = NextResponse.json(
      { error: error.message || 'Failed to fetch invoice details' },
      { status: 500 }
    );
    return setCorsHeaders(res);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  try {
    const { ref } = await params;
    const body = await req.json().catch(() => ({}));
    const { paymentMethod = 'UPI_ONLINE', transactionId } = body;

    const booking = await prisma.booking.findFirst({
      where: {
        OR: [
          { humanReadableRef: ref },
          { id: ref },
        ],
      },
      include: { payments: true },
    });

    if (!booking) {
      const res = NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      return setCorsHeaders(res);
    }

    const payAmount = Number(booking.balanceAmount);
    const txnId = transactionId || `pay_upi_${Date.now()}`;

    // Upsert balance payment
    const existing = booking.payments.find((p) => p.type === PaymentType.BALANCE);
    let payment;
    if (existing) {
      payment = await prisma.payment.update({
        where: { id: existing.id },
        data: {
          amount: payAmount,
          paymentMethod,
          razorpayPaymentId: txnId,
          status: PaymentStatus.PAID,
          verifiedAt: new Date(),
        },
      });
    } else {
      payment = await prisma.payment.create({
        data: {
          bookingId: booking.id,
          type: PaymentType.BALANCE,
          amount: payAmount,
          paymentMethod,
          razorpayPaymentId: txnId,
          status: PaymentStatus.PAID,
          verifiedAt: new Date(),
        },
      });
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        balancePaymentStatus: PaymentStatus.PAID,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'CUSTOMER_BALANCE_PAID',
        entityType: 'Booking',
        entityId: booking.id,
        reason: `Customer paid balance of ₹${payAmount} online via ${paymentMethod} (Txn: ${txnId})`,
      },
    });

    const res = NextResponse.json({
      success: true,
      message: 'Balance payment completed successfully',
      receiptNumber: `RCP-${booking.humanReadableRef}`,
      transactionId: txnId,
      booking: updated,
      payment,
    });
    return setCorsHeaders(res);
  } catch (error: any) {
    console.error('Error processing customer balance payment:', error);
    const res = NextResponse.json(
      { error: error.message || 'Payment processing failed' },
      { status: 500 }
    );
    return setCorsHeaders(res);
  }
}
