import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@kandy-cabs/db';
import { DriverVerificationStatus, BookingStatus } from '@kandy-cabs/shared';
import { getAdminSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession(req);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Admin privileges required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const onlineOnly = searchParams.get('onlineOnly') === 'true';

    const whereClause: any = {
      deletedAt: null,
    };

    if (onlineOnly) {
      whereClause.onlineStatus = true;
    }

    const drivers = await prisma.driver.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, fullName: true, phone: true },
        },
        vehicles: {
          where: { deletedAt: null },
        },
        assignedBookings: {
          where: {
            deletedAt: null,
            status: {
              in: [
                BookingStatus.DRIVER_ACCEPTED,
                BookingStatus.DRIVER_EN_ROUTE,
                BookingStatus.TRIP_STARTED,
              ],
            },
          },
          select: {
            id: true,
            humanReadableRef: true,
            status: true,
            tripType: true,
            pickupAddress: true,
            dropAddress: true,
          },
        },
      },
      orderBy: [
        { onlineStatus: 'desc' },
        { user: { createdAt: 'desc' } },
      ],
    });

    return NextResponse.json(
      {
        success: true,
        drivers: drivers,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error in GET /api/admin/drivers/online:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch online drivers', drivers: [] },
      { status: 500 }
    );
  }
}
