import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@kandy-cabs/db';
import { setCorsHeaders, handleOptions } from '@/lib/cors';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      sessionId,
      platform = 'WEB',
      device,
      browser,
      city,
      referrer,
      eventType,
      category,
      tripType,
      pickup,
      drop,
      metadata = {},
    } = body;

    if (!sessionId || !eventType) {
      const res = NextResponse.json(
        { success: false, message: 'sessionId and eventType are required' },
        { status: 400 }
      );
      return setCorsHeaders(res);
    }

    const now = new Date();

    // 1. Upsert session
    await prisma.visitorSession.upsert({
      where: { sessionId },
      update: {
        lastActiveAt: now,
        platform: platform || 'WEB',
        device: device || undefined,
        browser: browser || undefined,
        city: city || undefined,
        referrer: referrer || undefined,
      },
      create: {
        sessionId,
        platform: platform || 'WEB',
        device: device || null,
        browser: browser || null,
        city: city || null,
        referrer: referrer || null,
        firstSeenAt: now,
        lastActiveAt: now,
      },
    });

    // 2. Record event
    const event = await prisma.analyticsEvent.create({
      data: {
        sessionId,
        eventType,
        category: category || null,
        tripType: tripType || null,
        pickup: pickup || null,
        drop: drop || null,
        metadata: metadata || {},
        createdAt: now,
      },
    });

    const res = NextResponse.json({ success: true, eventId: event.id }, { status: 200 });
    return setCorsHeaders(res);
  } catch (error: any) {
    console.error('Error logging analytics event:', error);
    const res = NextResponse.json(
      { success: false, error: error.message || 'Failed to log event' },
      { status: 500 }
    );
    return setCorsHeaders(res);
  }
}
