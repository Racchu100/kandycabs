import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@kandy-cabs/db';
import { BookingStatus, DriverVerificationStatus } from '@kandy-cabs/shared';
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

    // Parallel fetch of all high-level operational statistics
    const [
      totalBookings,
      pendingAdminBookings,
      dispatchedBookings,
      activeRidesCount,
      completedBookings,
      cancelledBookings,
      totalDrivers,
      onlineDrivers,
      pendingKycDrivers,
      approvedDrivers,
      totalFleets,
      pricingRulesCount,
      paymentsSummary,
      recentBookings,
      recentAuditLogs,
    ] = await Promise.all([
      // 1. Total bookings
      prisma.booking.count({ where: { deletedAt: null } }),

      // 2. Pending admin action (needs dispatch)
      prisma.booking.count({ where: { status: BookingStatus.PENDING_ADMIN, deletedAt: null } }),

      // 3. Dispatched (waiting driver acceptance)
      prisma.booking.count({ where: { status: BookingStatus.DISPATCHED, deletedAt: null } }),

      // 4. Active rides on road
      prisma.booking.count({
        where: {
          status: {
            in: [
              BookingStatus.DISPATCHED,
              BookingStatus.DRIVER_ACCEPTED,
              BookingStatus.DRIVER_EN_ROUTE,
              BookingStatus.TRIP_STARTED,
            ],
          },
          deletedAt: null,
        },
      }),

      // 5. Completed bookings
      prisma.booking.count({ where: { status: BookingStatus.TRIP_COMPLETED, deletedAt: null } }),

      // 6. Cancelled bookings
      prisma.booking.count({ where: { status: BookingStatus.CANCELLED, deletedAt: null } }),

      // 7. Total Drivers
      prisma.driver.count({ where: { deletedAt: null } }),

      // 8. Online Drivers
      prisma.driver.count({ where: { onlineStatus: true, deletedAt: null } }),

      // 9. Pending KYC Drivers
      prisma.driver.count({
        where: { verificationStatus: DriverVerificationStatus.PENDING, deletedAt: null },
      }),

      // 10. Approved Drivers
      prisma.driver.count({
        where: { verificationStatus: DriverVerificationStatus.APPROVED, deletedAt: null },
      }),

      // 11. Total Fleet Categories
      prisma.fleetCategory.count(),

      // 12. Active Pricing Rules
      prisma.pricingRule.count(),

      // 13. Financial aggregations
      prisma.booking.aggregate({
        where: { deletedAt: null },
        _sum: {
          estimatedFare: true,
          advanceAmount: true,
        },
      }),

      // 14. Latest 6 bookings
      prisma.booking.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: {
          customer: {
            include: {
              user: { select: { fullName: true, phone: true } },
            },
          },
          assignedDriver: {
            include: {
              user: { select: { fullName: true, phone: true } },
            },
          },
          vehicle: true,
        },
      }),

      // 15. Latest 6 audit logs
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: {
          actorUser: {
            select: { fullName: true, phone: true, roles: true },
          },
        },
      }),
    ]);

    const grossRevenue = Number(paymentsSummary._sum?.estimatedFare || 0);
    const advanceCollected = Number(paymentsSummary._sum?.advanceAmount || 0);

    return NextResponse.json({
      stats: {
        bookings: {
          total: totalBookings,
          pendingAdmin: pendingAdminBookings,
          dispatched: dispatchedBookings,
          active: activeRidesCount,
          completed: completedBookings,
          cancelled: cancelledBookings,
        },
        financials: {
          grossRevenue,
          advanceCollected,
        },
        drivers: {
          total: totalDrivers,
          online: onlineDrivers,
          pendingKyc: pendingKycDrivers,
          approved: approvedDrivers,
        },
        fleets: {
          categoriesCount: totalFleets,
          pricingRulesCount: pricingRulesCount,
        },
      },
      recentBookings,
      recentAuditLogs,
    });
  } catch (error: any) {
    console.error('Error fetching admin dashboard stats:', error);
    return NextResponse.json(
      { error: 'InternalServerError', message: error.message || 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
