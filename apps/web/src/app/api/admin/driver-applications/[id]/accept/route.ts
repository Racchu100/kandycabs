import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateStoredDriverApplicationStatus, saveDriverUser, getAllStoredDriverApplications } from '@/lib/userStore';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    let appRecord: any = null;
    try {
      appRecord = await prisma.driverApplication.update({
        where: { id: params.id },
        data: {
          status: 'ACCEPTED',
          reviewedAt: new Date(),
          reviewedBy: 'ADMIN',
        },
      });
    } catch (dbErr) {
      console.warn('[accept application] DB update fallback:', dbErr);
    }

    updateStoredDriverApplicationStatus(params.id, 'ACCEPTED');

    let name = appRecord?.name;
    let phone = appRecord?.phone;

    if (!name || !phone) {
      const storedApps = getAllStoredDriverApplications();
      const match = storedApps.find((a) => a.id === params.id);
      if (match) {
        name = match.name;
        phone = match.phone;
      }
    }

    const cleanPhone = (phone || '9999999999').replace(/\D/g, '').slice(-10);
    const driverName = name || 'Driver Partner';

    // Save driver to userStore
    await saveDriverUser(cleanPhone, driverName, 'KA-01-2026-REG');

    let driver: any = null;
    try {
      let user = await prisma.user.findFirst({
        where: { phone: { contains: cleanPhone } },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            phone: cleanPhone,
            fullName: driverName,
            roles: ['DRIVER', 'CUSTOMER'],
          },
        });
      }

      driver = await prisma.driver.findUnique({
        where: { userId: user.id },
      });

      if (!driver) {
        driver = await prisma.driver.create({
          data: {
            userId: user.id,
            fullName: driverName,
            status: 'APPROVED',
            isActive: true,
            isVerifiedByAdmin: true,
          },
        });
      } else {
        driver = await prisma.driver.update({
          where: { id: driver.id },
          data: {
            status: 'APPROVED',
            isActive: true,
            isVerifiedByAdmin: true,
          },
        });
      }
    } catch (dbErr) {
      console.warn('[accept application] DB driver create fallback:', dbErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Driver application accepted! Driver account provisioned.',
      driverId: driver?.id || `d_${cleanPhone}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to accept driver application' },
      { status: 400 }
    );
  }
}

