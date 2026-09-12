import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { saveUser, saveDriverUser, getAllStoredDrivers, getAllStoredDriverApplications } from '@/lib/userStore';
import { normalizePhone, UserRole } from '@kandycabs/shared';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const registerDriverSchema = z.object({
  fullName: z.string().min(2, 'Driver name is required'),
  phone: z.string().min(10, '10-digit phone number is required'),
  licenseNumber: z.string().optional(),
  vehicleCategory: z.string().optional(),
});

export async function GET() {
  try {
    let dbDrivers: any[] = [];
    let dbApplications: any[] = [];

    try {
      dbDrivers = await prisma.driver.findMany({
        include: {
          user: true,
          assignedVehicle: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      dbApplications = await prisma.driverApplication.findMany({
        orderBy: { createdAt: 'desc' },
      });
    } catch (dbErr) {
      console.warn('[admin/drivers] DB lookup fallback:', dbErr);
    }

    const storedDrivers = getAllStoredDrivers();
    const phoneSet = new Set<string>();
    const drivers: any[] = [];

    for (const d of dbDrivers) {
      const p = d.user?.phone ? normalizePhone(d.user.phone) : '';
      if (p) phoneSet.add(p);
      drivers.push(d);
    }

    for (const s of storedDrivers) {
      if (!phoneSet.has(s.user.phone)) {
        phoneSet.add(s.user.phone);
        drivers.push(s);
      }
    }

    // Merge DB applications and stored Applications
    const storedApps = getAllStoredDriverApplications();
    const appIds = new Set(dbApplications.map((a) => a.id));
    const mergedApps = [...dbApplications];
    for (const sa of storedApps) {
      if (!appIds.has(sa.id)) {
        mergedApps.push(sa);
      }
    }

    return NextResponse.json({ drivers, applications: mergedApps });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch drivers' },
      { status: 400 }
    );
  }
}


export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fullName, phone, licenseNumber, vehicleCategory } = registerDriverSchema.parse(body);
    const last10 = normalizePhone(phone);

    if (!last10 || last10.length !== 10) {
      return NextResponse.json({ error: 'Valid 10-digit phone number is required' }, { status: 400 });
    }

    // 1. Save driver user in memory store & Prisma DB with DRIVER role
    await saveDriverUser(last10, fullName, licenseNumber);

    let dbDriver: any = null;
    try {
      let user = await prisma.user.findFirst({
        where: { phone: { contains: last10 } },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            phone: last10,
            fullName,
            roles: [UserRole.DRIVER, UserRole.CUSTOMER],
          },
        });
      } else if (!user.roles.includes(UserRole.DRIVER)) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            fullName,
            roles: [UserRole.DRIVER, UserRole.CUSTOMER],
          },
        });
      }

      dbDriver = await prisma.driver.upsert({
        where: { userId: user.id },
        update: {
          fullName,
          licenseNumber: licenseNumber || 'KA-01-2026-REG',
          status: 'APPROVED',
          isActive: true,
          isVerifiedByAdmin: true,
        },
        create: {
          userId: user.id,
          fullName,
          licenseNumber: licenseNumber || 'KA-01-2026-REG',
          status: 'APPROVED',
          isActive: true,
          isVerifiedByAdmin: true,
        },
        include: { user: true },
      });

      await prisma.auditLog.create({
        data: {
          action: 'REGISTER_DRIVER_BY_ADMIN',
          entityType: 'DRIVER',
          entityId: dbDriver.id,
          afterJson: JSON.stringify({ fullName, phone: last10, status: 'APPROVED' }),
        },
      });
    } catch (dbErr) {
      console.warn('[admin/drivers POST] DB write fallback:', dbErr);
    }

    const driverObj = dbDriver || {
      id: `d_${last10}`,
      fullName,
      licenseNumber: licenseNumber || 'KA-01-2026-REG',
      status: 'APPROVED',
      isActive: true,
      isVerifiedByAdmin: true,
      user: { phone: last10, fullName },
    };

    console.log(`[ADMIN] Registered new driver partner: ${fullName} (+91 ${last10})`);

    return NextResponse.json({
      success: true,
      message: `Driver partner ${fullName} (+91 ${last10}) registered & provisioned successfully!`,
      driver: driverObj,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to register driver' },
      { status: 400 }
    );
  }
}
