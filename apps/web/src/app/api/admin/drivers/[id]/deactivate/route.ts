import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toggleStoredDriverActive } from '@/lib/userStore';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const deactivateSchema = z.object({
  isActive: z.boolean(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { isActive } = deactivateSchema.parse(body);

    try {
      await prisma.driver.update({
        where: { id: params.id },
        data: {
          isActive,
          status: isActive ? 'APPROVED' : 'DEACTIVATED',
        },
      });

      await prisma.auditLog.create({
        data: {
          action: isActive ? 'ACTIVATE_DRIVER' : 'SUSPEND_DRIVER',
          entityType: 'DRIVER',
          entityId: params.id,
          afterJson: JSON.stringify({ isActive }),
        },
      });
    } catch (dbErr) {
      console.warn('[deactivate POST] DB update fallback:', dbErr);
    }

    toggleStoredDriverActive(params.id, isActive);

    return NextResponse.json({
      success: true,
      driverId: params.id,
      isActive,
      message: `Driver account status set to ${isActive ? 'ACTIVE' : 'SUSPENDED'}.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update driver activation status' },
      { status: 400 }
    );
  }
}
