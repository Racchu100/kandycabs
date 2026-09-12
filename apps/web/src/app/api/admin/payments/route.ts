import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAllStoredBookings, updateStoredBookingPartial } from "@/lib/bookingStore";

export const dynamic = "force-dynamic";

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
        orderBy: { createdAt: "desc" },
      });
    } catch (dbErr) {
      console.warn("[admin/payments GET] DB fallback:", dbErr);
    }

    const storedBookings = getAllStoredBookings();
    const storedMap = new Map<string, any>();
    for (const s of storedBookings) {
      if (s.id) storedMap.set(s.id, s);
      if (s.humanReadableRef) storedMap.set(s.humanReadableRef, s);
    }

    const refSet = new Set<string>();
    const payments: any[] = [];

    for (const b of dbBookings) {
      refSet.add(b.humanReadableRef || b.id);
      const stored = storedMap.get(b.id) || storedMap.get(b.humanReadableRef);
      const advancePaid = b.advancePaymentStatus === "PAID";
      const balancePaid = b.balancePaymentStatus === "PAID";
      let paymentStatus = "PENDING";
      if (advancePaid && balancePaid) paymentStatus = "PAID";
      else if (advancePaid) paymentStatus = "PARTIALLY_PAID";

      payments.push({
        id: b.id,
        humanReadableRef: b.humanReadableRef,
        bookingStatus: stored?.status || b.status,
        customerName: b.customer?.fullName || "N/A",
        customerPhone: b.customer?.user?.phone || "N/A",
        driverName: b.assignedDriver?.fullName || "N/A",
        estimatedFare: b.estimatedFare || 0,
        advanceAmount: b.advanceAmount || 0,
        balanceAmount: b.balanceAmount || 0,
        tollAmount: b.tollAmount || 0,
        advancePaymentStatus: b.advancePaymentStatus || "PENDING",
        balancePaymentStatus: b.balancePaymentStatus || "PENDING",
        paymentStatus,
        advancePaymentRef: b.advancePaymentRef || null,
        balancePaymentRef: b.balancePaymentRef || null,
        advancePaidAt: b.advancePaidAt || null,
        createdAt: b.createdAt,
        scheduledAt: b.scheduledAt,
        priceSnapshot: stored?.priceSnapshot || b.priceSnapshot || null,
      });
    }

    for (const s of storedBookings) {
      if (!refSet.has(s.humanReadableRef) && !refSet.has(s.id)) {
        refSet.add(s.humanReadableRef || s.id);
        const advancePaid = s.advancePaymentStatus === "PAID";
        const balancePaid = s.balancePaymentStatus === "PAID";
        let paymentStatus = "PENDING";
        if (advancePaid && balancePaid) paymentStatus = "PAID";
        else if (advancePaid) paymentStatus = "PARTIALLY_PAID";

        payments.push({
          id: s.id,
          humanReadableRef: s.humanReadableRef,
          bookingStatus: s.status,
          customerName: s.customer?.fullName || "N/A",
          customerPhone: s.customer?.user?.phone || s.customer?.phone || "N/A",
          driverName: s.assignedDriver?.fullName || "N/A",
          estimatedFare: s.estimatedFare || 0,
          advanceAmount: s.advanceAmount || 0,
          balanceAmount: s.balanceAmount || 0,
          tollAmount: s.tollAmount || 0,
          advancePaymentStatus: s.advancePaymentStatus || "PENDING",
          balancePaymentStatus: s.balancePaymentStatus || "PENDING",
          paymentStatus,
          advancePaymentRef: null,
          balancePaymentRef: null,
          advancePaidAt: null,
          createdAt: s.createdAt,
          scheduledAt: s.scheduledAt,
          priceSnapshot: s.priceSnapshot || null,
        });
      }
    }

    return NextResponse.json({ payments });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch payments" },
      { status: 400 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bookingId, paymentType = "FULL", refNumber } = body;

    if (!bookingId) {
      return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
    }

    const txRef = refNumber || `MANUAL_PAY_${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();

    // 1. Update in-memory bookingStore
    updateStoredBookingPartial(bookingId, {
      advancePaymentStatus: "PAID",
      balancePaymentStatus: "PAID",
      advancePaymentRef: txRef,
      balancePaymentRef: txRef,
    });

    // 2. Try updating Prisma DB
    try {
      await prisma.booking.updateMany({
        where: {
          OR: [{ id: bookingId }, { humanReadableRef: bookingId }],
        },
        data: {
          advancePaymentStatus: "PAID",
          balancePaymentStatus: "PAID",
          advancePaymentRef: txRef,
          balancePaymentRef: txRef,
          advancePaidAt: new Date(),
        } as any,
      });

      await prisma.auditLog.create({
        data: {
          action: "ADMIN_MARK_PAYMENT_RECEIVED",
          entityType: "BOOKING",
          entityId: bookingId,
          afterJson: JSON.stringify({ paymentType, txRef, status: "PAID" }),
        },
      });
    } catch (dbErr) {
      console.warn("[admin/payments POST] DB update notice:", dbErr);
    }

    return NextResponse.json({
      success: true,
      message: `Payment for booking ${bookingId} marked as RECEIVED!`,
      txRef,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process payment update" },
      { status: 400 }
    );
  }
}
