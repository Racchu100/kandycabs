import { NextResponse } from 'next/server';
import { updateStoredDriverDuty } from '@/lib/userStore';
import { prisma, safeDbQuery } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { isOnline, phone, driverId } = body;

    const target = phone || driverId;
    if (target) {
      updateStoredDriverDuty(target, !!isOnline);
    }

    safeDbQuery(async () => {
      if (driverId) {
        await prisma.driver.update({
          where: { id: driverId },
          data: { isOnline: !!isOnline } as any,
        });
      }
    }).catch(() => {});

    return NextResponse.json({ success: true, isOnline: !!isOnline });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update driver duty status' }, { status: 400 });
  }
}
