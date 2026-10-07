import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@kandy-cabs/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || 'TODAY'; // 'TODAY' | 'YESTERDAY' | '7D' | '30D' | 'ALL'

    const now = new Date();
    let startDate = new Date();

    if (range === 'TODAY') {
      startDate.setHours(0, 0, 0, 0);
    } else if (range === 'YESTERDAY') {
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
    } else if (range === '7D') {
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (range === '30D') {
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate = new Date(0); // All time
    }

    let endDate = now;
    if (range === 'YESTERDAY') {
      const yesterdayEnd = new Date(startDate);
      yesterdayEnd.setHours(23, 59, 59, 999);
      endDate = yesterdayEnd;
    }

    // 1. Total Unique Visitors (Sessions active in this window)
    const uniqueVisitorsCount = await prisma.visitorSession.count({
      where: {
        lastActiveAt: { gte: startDate, lte: endDate },
      },
    });

    // 1b. New vs Returning Visitors
    const newVisitorsCount = await prisma.visitorSession.count({
      where: {
        firstSeenAt: { gte: startDate, lte: endDate },
      },
    });
    const returningVisitorsCount = Math.max(uniqueVisitorsCount - newVisitorsCount, 0);

    // 2. Fetch all events in this window
    const events = await prisma.analyticsEvent.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        eventType: true,
        category: true,
        tripType: true,
        sessionId: true,
      },
    });

    // Count unique visitors per funnel stage
    const sessionViewRates = new Set<string>();
    const sessionViewHatchback = new Set<string>();
    const sessionViewSedan = new Set<string>();
    const sessionViewSuv = new Set<string>();
    const sessionViewSuvPremium = new Set<string>();
    const sessionViewTempo = new Set<string>();
    const sessionStartedBooking = new Set<string>();
    const sessionCompletedBooking = new Set<string>();

    for (const e of events) {
      if (e.eventType === 'VIEW_RATES') sessionViewRates.add(e.sessionId);
      if (e.eventType === 'VIEW_HATCHBACK' || e.category === 'HATCHBACK') sessionViewHatchback.add(e.sessionId);
      if (e.eventType === 'VIEW_SEDAN' || e.category === 'SEDAN') sessionViewSedan.add(e.sessionId);
      if (e.eventType === 'VIEW_SUV' || e.category === 'SUV') sessionViewSuv.add(e.sessionId);
      if (e.eventType === 'VIEW_SUV_PREMIUM' || e.category === 'SUV_PREMIUM') sessionViewSuvPremium.add(e.sessionId);
      if (e.eventType === 'VIEW_TEMPO_TRAVELER' || e.category === 'TEMPO_TRAVELER') sessionViewTempo.add(e.sessionId);
      if (e.eventType === 'STARTED_BOOKING') sessionStartedBooking.add(e.sessionId);
      if (e.eventType === 'COMPLETED_BOOKING') sessionCompletedBooking.add(e.sessionId);
    }

    // 3. Database Bookings & Customer Segmentation (New vs Existing Customers)
    const bookingsInWindow = await prisma.booking.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      select: {
        id: true,
        customerId: true,
        createdAt: true,
        customer: {
          select: {
            id: true,
            user: {
              select: {
                createdAt: true,
              },
            },
            _count: {
              select: { bookings: true },
            },
          },
        },
      },
    });

    const completedBookingCount = Math.max(sessionCompletedBooking.size, bookingsInWindow.length);
    const totalVisitors = Math.max(uniqueVisitorsCount, sessionViewRates.size, completedBookingCount, 1);

    // Analyze New vs Existing / Returning Customers for bookings
    let newCustomersCount = 0;
    let existingCustomersCount = 0;

    for (const b of bookingsInWindow) {
      if (b.customer) {
        const userCreatedAt = b.customer.user?.createdAt;
        // If customer has only 1 booking or user created in this window -> New Customer
        if (b.customer._count.bookings <= 1 || (userCreatedAt && userCreatedAt >= startDate && userCreatedAt <= endDate)) {
          newCustomersCount++;
        } else {
          existingCustomersCount++;
        }
      } else {
        newCustomersCount++;
      }
    }

    // New Customers Registered in window
    const newRegisteredCustomers = await prisma.customer.count({
      where: {
        user: {
          createdAt: { gte: startDate, lte: endDate },
        },
        deletedAt: null,
      },
    });

    // 4. Platform Breakdown (Web vs Mobile App)
    const webSessions = await prisma.visitorSession.count({
      where: {
        lastActiveAt: { gte: startDate, lte: endDate },
        platform: { in: ['WEB', 'MOBILE_WEB'] },
      },
    });

    const appSessions = await prisma.visitorSession.count({
      where: {
        lastActiveAt: { gte: startDate, lte: endDate },
        platform: 'CUSTOMER_APP',
      },
    });

    // 5. Recent Visitor Stream (Last 30 active sessions with latest activity)
    const recentSessions = await prisma.visitorSession.findMany({
      where: {
        lastActiveAt: { gte: startDate, lte: endDate },
      },
      orderBy: { lastActiveAt: 'desc' },
      take: 30,
      include: {
        events: {
          orderBy: { createdAt: 'desc' },
          take: 6,
        },
      },
    });

    const formattedSessions = recentSessions.map((s) => {
      const latestEvent = s.events[0];
      const hasCompleted = s.events.some((e) => e.eventType === 'COMPLETED_BOOKING');
      const hasStarted = s.events.some((e) => e.eventType === 'STARTED_BOOKING');
      const hasViewedRates = s.events.some((e) => e.eventType === 'VIEW_RATES');

      let lastStage = 'Browsing';
      if (hasCompleted) lastStage = 'Completed Booking';
      else if (hasStarted) lastStage = 'Started Booking';
      else if (hasViewedRates) lastStage = 'Viewed Rates';

      const searchedCategory =
        s.events.find((e) => e.category)?.category || latestEvent?.category || null;
      const searchedRoute =
        latestEvent?.pickup && latestEvent?.drop
          ? `${latestEvent.pickup} ➔ ${latestEvent.drop}`
          : null;

      const isFirstTimeVisitor = s.firstSeenAt >= startDate;

      return {
        sessionId: s.sessionId,
        platform: s.platform,
        device: s.device || 'Desktop',
        city: s.city || 'Mangaluru / Karnataka',
        firstSeenAt: s.firstSeenAt.toISOString(),
        lastActiveAt: s.lastActiveAt.toISOString(),
        lastStage,
        searchedCategory,
        searchedRoute,
        isFirstTimeVisitor,
        customerType: isFirstTimeVisitor ? 'NEW' : 'RETURNING',
        eventsCount: s.events.length,
      };
    });

    return NextResponse.json({
      success: true,
      range,
      summary: {
        visitors: totalVisitors,
        viewRates: sessionViewRates.size,
        viewHatchback: sessionViewHatchback.size,
        viewSedan: sessionViewSedan.size,
        viewSuv: sessionViewSuv.size,
        viewSuvPremium: sessionViewSuvPremium.size,
        viewTempo: sessionViewTempo.size,
        startedBooking: sessionStartedBooking.size,
        completedBooking: completedBookingCount,
      },
      customerSegments: {
        newVisitors: Math.max(newVisitorsCount, 1),
        returningVisitors: returningVisitorsCount,
        newCustomers: Math.max(newCustomersCount, newRegisteredCustomers),
        existingCustomers: existingCustomersCount,
      },
      platforms: {
        web: webSessions,
        app: appSessions,
      },
      recentSessions: formattedSessions,
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/analytics/activity:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
