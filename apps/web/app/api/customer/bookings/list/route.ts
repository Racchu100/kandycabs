import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@kandy-cabs/db';
import { verifyAuthToken, BookingStatus } from '@kandy-cabs/shared';
import { setCorsHeaders, handleOptions } from '@/lib/cors';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate customer
    let token = req.cookies.get('kandy_session')?.value;
    if (!token) {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      }
    }

    if (!token) {
      const res = NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
      return setCorsHeaders(res);
    }

    const payload = await verifyAuthToken(token);
    if (!payload || !payload.userId) {
      const res = NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid or expired token' },
        { status: 401 }
      );
      return setCorsHeaders(res);
    }

    const customer = await prisma.customer.findUnique({
      where: { userId: payload.userId },
    });

    if (!customer) {
      const res = NextResponse.json(
        { success: true, bookings: [], customerId: null },
        { status: 200 }
      );
      return setCorsHeaders(res);
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category')?.toUpperCase() || 'ALL';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));

    const where: any = {
      customerId: customer.id,
      deletedAt: null,
    };

    if (category === 'ACTIVE') {
      where.status = {
        in: [
          BookingStatus.PENDING_ADMIN,
          BookingStatus.DISPATCHED,
          BookingStatus.DRIVER_ACCEPTED,
          BookingStatus.DRIVER_EN_ROUTE,
          BookingStatus.TRIP_STARTED,
        ],
      };
    } else if (category === 'COMPLETED') {
      where.status = BookingStatus.TRIP_COMPLETED;
    } else if (category === 'CANCELLED') {
      where.status = BookingStatus.CANCELLED;
    }

    const [totalCount, bookings] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          assignedDriver: {
            include: {
              user: {
                select: { fullName: true, phone: true },
              },
              vehicles: true,
            },
          },
          vehicle: true,
          payments: {
            orderBy: { verifiedAt: 'desc' },
          },
          tripEvents: {
            where: { type: 'BOOKING_CREATED' },
            take: 1,
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit) || 1;

    const response = NextResponse.json(
      {
        success: true,
        customerId: customer.id,
        bookings,
        pagination: {
          totalCount,
          totalPages,
          page,
          limit,
        },
      },
      { status: 200 }
    );
    return setCorsHeaders(response);
  } catch (error: any) {
    console.error('Error in GET /api/customer/bookings/list:', error);
    const res = NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch customer bookings', bookings: [] },
      { status: 500 }
    );
    return setCorsHeaders(res);
  }
}
