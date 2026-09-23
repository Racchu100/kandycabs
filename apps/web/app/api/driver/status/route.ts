import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@kandy-cabs/db';
import { getDriverSession } from '@/lib/driver-auth';
import { BookingStatus } from '@kandy-cabs/shared';
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

    // Fetch active assigned ride if any
    const activeBooking = await prisma.booking.findFirst({
      where: {
        assignedDriverId: session.driverId,
        deletedAt: null,
        status: {
          in: [
            BookingStatus.DRIVER_ACCEPTED,
            BookingStatus.DRIVER_EN_ROUTE,
            BookingStatus.TRIP_STARTED,
          ],
        },
      },
      include: {
        customer: {
          include: {
            user: { select: { fullName: true, phone: true } },
          },
        },
        vehicle: true,
      },
    });

    const response = NextResponse.json(
      {
        success: true,
        driver: {
          id: session.driver.id,
          fullName: session.user.fullName,
          phone: session.user.phone,
          licenseNumber: session.driver.licenseNumber,
          profilePhotoUrl: session.driver.profilePhotoUrl,
          licenseDocUrl: session.driver.licenseDocUrl,
          rcDocUrl: session.driver.rcDocUrl,
          insuranceDocUrl: session.driver.insuranceDocUrl,
          vehiclePhotos: session.driver.vehiclePhotos || [],
          verificationStatus: session.driver.verificationStatus,
          onlineStatus: session.driver.onlineStatus,
          currentLat: session.driver.currentLat,
          currentLng: session.driver.currentLng,
          lastPingAt: session.driver.lastPingAt,
          vehicle: session.driver.vehicles[0] || null,
        },
        activeBooking: activeBooking || null,
      },
      { status: 200 }
    );
    return setCorsHeaders(response);
  } catch (error: any) {
    console.error('Error in GET /api/driver/status:', error);
    const res = NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch driver status' },
      { status: 500 }
    );
    return setCorsHeaders(res);
  }
}
