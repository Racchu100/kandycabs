import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@kandy-cabs/db';
import { getAdminSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAdminSession(req);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Admin privileges required' },
        { status: 401 }
      );
    }

    const { id } = params;

    const points = await prisma.tripTracking.findMany({
      where: { bookingId: id },
      orderBy: { recordedAt: 'asc' },
      take: 50,
      select: {
        id: true,
        lat: true,
        lng: true,
        recordedAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        points,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error in GET /api/admin/bookings/[id]/tracking:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch tracking points', points: [] },
      { status: 500 }
    );
  }
}
