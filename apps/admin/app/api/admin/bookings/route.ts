import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@kandy-cabs/db';
import { BookingStatus } from '@kandy-cabs/shared';
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
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const rawLimit = parseInt(searchParams.get('limit') || '25', 10);
    const limit = Math.min(50, Math.max(1, rawLimit));
    const statusParam = searchParams.get('status')?.toUpperCase();
    const search = searchParams.get('search')?.trim();

    const where: any = {
      deletedAt: null,
    };

    if (statusParam && statusParam !== 'ALL' && Object.values(BookingStatus).includes(statusParam as any)) {
      where.status = statusParam as BookingStatus;
    }

    if (search) {
      where.OR = [
        { humanReadableRef: { contains: search, mode: 'insensitive' } },
        { customer: { user: { phone: { contains: search } } } },
        { customer: { user: { fullName: { contains: search, mode: 'insensitive' } } } },
        { pickupAddress: { contains: search, mode: 'insensitive' } },
        { dropAddress: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [totalCount, bookings] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          humanReadableRef: true,
          tripType: true,
          pickupAddress: true,
          dropAddress: true,
          distanceKm: true,
          estimatedFare: true,
          advanceAmount: true,
          status: true,
          customerPhoneReleased: true,
          driverPaymentStatus: true,
          createdAt: true,
          customer: {
            select: {
              user: {
                select: { id: true, fullName: true, phone: true },
              },
            },
          },
          assignedDriver: {
            select: {
              user: {
                select: { id: true, fullName: true, phone: true },
              },
            },
          },
          tripEvents: {
            where: { type: 'OVERRIDE_REQUESTED' },
            select: { id: true, type: true },
          },
          dispatches: {
            select: { id: true },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit) || 1;

    // Always return 200 with array (even if 0 results)
    return NextResponse.json(
      {
        success: true,
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
  } catch (error: any) {
    console.error('Error in GET /api/admin/bookings:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch bookings', bookings: [] },
      { status: 500 }
    );
  }
}
