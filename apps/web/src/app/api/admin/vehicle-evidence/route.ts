import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAllStoredDrivers, getDriverDocuments } from '@/lib/userStore';
import { normalizePhone } from '@kandycabs/shared';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let dbDrivers: any[] = [];
    try {
      dbDrivers = await prisma.driver.findMany({
        include: {
          user: true,
          assignedVehicle: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (dbErr) {
      console.warn('[vehicle-evidence GET] DB fallback:', dbErr);
    }

    const storedDrivers = getAllStoredDrivers();
    const phoneSet = new Set<string>();
    const drivers: any[] = [];

    for (const d of dbDrivers) {
      const phone = d.user?.phone ? normalizePhone(d.user.phone) : '';
      if (phone) phoneSet.add(phone);
      const docs = phone ? getDriverDocuments(phone) : null;
      drivers.push({
        id: d.id,
        fullName: d.fullName,
        phone: d.user?.phone || '',
        licenseNumber: d.licenseNumber || docs?.licenseNumber || 'N/A',
        vehicleName: d.assignedVehicle?.name || docs?.vehicleName || 'N/A',
        vehicleNumber: d.assignedVehicle?.registrationNumber || docs?.vehicleNumber || 'N/A',
        status: d.status || 'PENDING',
        isVerifiedByAdmin: d.isVerifiedByAdmin || false,
        isActive: d.isActive || false,
        licenseDocUrl: docs?.licenseDocUrl || d.licenseDocUrl || null,
        rcDocUrl: docs?.rcDocUrl || d.rcDocUrl || null,
        insuranceDocUrl: docs?.insuranceDocUrl || d.insuranceDocUrl || null,
        driverPhotoUrl: docs?.driverPhotoUrl || null,
        vehiclePhotos: docs?.vehiclePhotos || d.vehiclePhotos || [],
        docsUploaded: !!(docs?.licenseDocUrl || d.licenseDocUrl),
      });
    }

    for (const s of storedDrivers) {
      const phone = normalizePhone(s.user?.phone || '');
      if (!phoneSet.has(phone)) {
        phoneSet.add(phone);
        const docs = phone ? getDriverDocuments(phone) : null;
        drivers.push({
          id: s.id,
          fullName: s.fullName,
          phone: s.user?.phone || '',
          licenseNumber: docs?.licenseNumber || s.licenseNumber || 'N/A',
          vehicleName: docs?.vehicleName || s.vehicleName || 'N/A',
          vehicleNumber: docs?.vehicleNumber || s.vehicleNumber || 'N/A',
          status: s.status || 'PENDING',
          isVerifiedByAdmin: s.isVerifiedByAdmin || false,
          isActive: s.isActive || false,
          licenseDocUrl: docs?.licenseDocUrl || s.licenseDocUrl || null,
          rcDocUrl: docs?.rcDocUrl || s.rcDocUrl || null,
          insuranceDocUrl: docs?.insuranceDocUrl || s.insuranceDocUrl || null,
          driverPhotoUrl: docs?.driverPhotoUrl || null,
          vehiclePhotos: docs?.vehiclePhotos || s.vehiclePhotos || [],
          docsUploaded: !!(docs?.licenseDocUrl || s.licenseDocUrl),
        });
      }
    }

    return NextResponse.json({ drivers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch vehicle evidence' }, { status: 400 });
  }
}
