import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateStoredBookingContactRelease } from '@/lib/bookingStore';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const releaseSchema = z.object({
  release: z.boolean(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { release } = releaseSchema.parse(body);

    // 1. Update in-memory booking store
    updateStoredBookingContactRelease(params.id, release);

    // 2. Update Prisma DB if record exists
    let updatedDbBooking: any = null;
    try {
      const found = await prisma.booking.findFirst({
        where: { OR: [{ id: params.id }, { humanReadableRef: params.id }] },
      });

      if (found) {
        updatedDbBooking = await prisma.booking.update({
          where: { id: found.id },
          data: { customerPhoneReleased: release },
        });

        await prisma.auditLog.create({
          data: {
            action: 'TOGGLE_CUSTOMER_CONTACT_RELEASE',
            entityType: 'BOOKING',
            entityId: found.id,
            afterJson: JSON.stringify({ customerPhoneReleased: release }),
          },
        }).catch(() => {});
      }
    } catch (dbErr) {
      console.warn('[release-contact POST] DB update fallback:', dbErr);
    }

    return NextResponse.json({
      success: true,
      bookingId: params.id,
      customerPhoneReleased: release,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update contact release' },
      { status: 400 }
    );
  }
}
