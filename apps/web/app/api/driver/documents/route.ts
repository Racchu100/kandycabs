import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@kandy-cabs/db';
import { getDriverSession } from '@/lib/driver-auth';
import { DriverVerificationStatus } from '@kandy-cabs/shared';
import { setCorsHeaders, handleOptions } from '@/lib/cors';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(req: NextRequest) {
  try {
    const session = await getDriverSession(req);
    if (!session) {
      const res = NextResponse.json(
        { error: 'Unauthorized', message: 'Driver authentication required' },
        { status: 401 }
      );
      return setCorsHeaders(res);
    }

    const driver = await prisma.driver.findUnique({
      where: { id: session.driverId },
      include: {
        user: { select: { fullName: true, phone: true } },
        vehicles: {
          where: { deletedAt: null },
          select: { id: true, category: true, plateNumber: true, fuelType: true },
        },
      },
    });

    if (!driver) {
      const res = NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      );
      return setCorsHeaders(res);
    }

    const response = NextResponse.json(
      {
        success: true,
        documents: {
          licenseNumber: driver.licenseNumber,
          profilePhotoUrl: driver.profilePhotoUrl,
          licenseDocUrl: driver.licenseDocUrl,
          rcDocUrl: driver.rcDocUrl,
          insuranceDocUrl: driver.insuranceDocUrl,
          vehiclePhotos: driver.vehiclePhotos || [],
          verificationStatus: driver.verificationStatus,
          adminNotes: driver.adminNotes,
          vehicle: driver.vehicles[0] || null,
        },
      },
      { status: 200 }
    );
    return setCorsHeaders(response);
  } catch (error: any) {
    console.error('Error in GET /api/driver/documents:', error);
    const res = NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch documents' },
      { status: 500 }
    );
    return setCorsHeaders(res);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getDriverSession(req);
    if (!session) {
      const res = NextResponse.json(
        { error: 'Unauthorized', message: 'Driver authentication required' },
        { status: 401 }
      );
      return setCorsHeaders(res);
    }

    const body = await req.json();
    const {
      licenseNumber,
      profilePhotoUrl,
      licenseDocUrl,
      rcDocUrl,
      insuranceDocUrl,
      vehiclePhotos = [],
      plateNumber,
    } = body;

    const dataToUpdate: any = {
      verificationStatus: DriverVerificationStatus.PENDING,
    };

    if (licenseNumber !== undefined && licenseNumber !== null) {
      dataToUpdate.licenseNumber = String(licenseNumber).trim().toUpperCase();
    }
    if (profilePhotoUrl !== undefined) {
      dataToUpdate.profilePhotoUrl = profilePhotoUrl;
    }
    if (licenseDocUrl !== undefined) {
      dataToUpdate.licenseDocUrl = licenseDocUrl;
    }
    if (rcDocUrl !== undefined) {
      dataToUpdate.rcDocUrl = rcDocUrl;
    }
    if (insuranceDocUrl !== undefined) {
      dataToUpdate.insuranceDocUrl = insuranceDocUrl;
    }
    if (Array.isArray(vehiclePhotos)) {
      dataToUpdate.vehiclePhotos = vehiclePhotos;
    }

    const updatedDriver = await prisma.driver.update({
      where: { id: session.driverId },
      data: dataToUpdate,
      include: {
        user: { select: { fullName: true, phone: true } },
        vehicles: true,
      },
    });

    if (plateNumber && updatedDriver.vehicles.length > 0) {
      await prisma.vehicle.update({
        where: { id: updatedDriver.vehicles[0].id },
        data: { plateNumber: String(plateNumber).trim().toUpperCase() },
      });
    }

    // Log audit event
    await prisma.auditLog.create({
      data: {
        actorUserId: session.userId,
        action: 'DRIVER_DOCUMENTS_UPLOADED',
        entityType: 'Driver',
        entityId: session.driverId,
        reason: `Driver uploaded KYC documents & vehicle inspection photos`,
      },
    });

    const response = NextResponse.json(
      {
        success: true,
        message: 'Documents and inspection photos saved successfully. Sent for Admin Verification.',
        driver: updatedDriver,
      },
      { status: 200 }
    );
    return setCorsHeaders(response);
  } catch (error: any) {
    console.error('Error in POST /api/driver/documents:', error);
    const res = NextResponse.json(
      { success: false, message: error.message || 'Failed to update documents' },
      { status: 500 }
    );
    return setCorsHeaders(res);
  }
}
