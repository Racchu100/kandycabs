import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const approveSchema = z.object({
  approved: z.boolean(),
  reason: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { approved, reason } = approveSchema.parse(body);

    const driver = await prisma.driver.update({
      where: { id: params.id },
      data: {
        status: approved ? 'APPROVED' : 'REJECTED',
        isVerifiedByAdmin: approved,
        isActive: approved,
        rejectionReason: approved ? null : reason || 'Documents rejected by admin',
      },
    });

    await prisma.auditLog.create({
      data: {
        action: approved ? 'APPROVE_DRIVER_DOCS' : 'REJECT_DRIVER_DOCS',
        entityType: 'DRIVER',
        entityId: params.id,
        afterJson: JSON.stringify({ status: driver.status, isActive: driver.isActive }),
      },
    });

    return NextResponse.json({
      success: true,
      driverId: driver.id,
      status: driver.status,
      isActive: driver.isActive,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update driver approval status' },
      { status: 400 }
    );
  }
}
