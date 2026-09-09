import { NextResponse } from 'next/server';
import { extractBearerToken, verifyToken } from '@/lib/auth';
import {
  sendNotification,
  getNotificationsByRecipient,
  NotificationPayload,
} from '@/lib/notificationEngine';

export async function POST(request: Request) {
  try {
    const token = extractBearerToken(request.headers.get('authorization'));
    const auth = verifyToken(token || '');

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { recipientId, recipientPhone, recipientEmail, eventType, channels, title, message, metadata } = body;

    if (!recipientId || !eventType || !channels || !title || !message) {
      return NextResponse.json(
        { error: 'recipientId, eventType, channels, title, and message are required' },
        { status: 400 }
      );
    }

    const payload: NotificationPayload = {
      recipientId,
      recipientPhone,
      recipientEmail,
      eventType,
      channels,
      title,
      message,
      metadata,
    };

    const { queuedIds } = await sendNotification(payload);

    return NextResponse.json({
      success: true,
      queuedIds,
      message: 'Notification queued for asynchronous background dispatch',
    });
  } catch {
    return NextResponse.json({ error: 'Failed to process notification' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const recipientId = searchParams.get('recipientId');

  if (!recipientId) {
    return NextResponse.json({ error: 'recipientId query parameter required' }, { status: 400 });
  }

  const notifications = getNotificationsByRecipient(recipientId);
  return NextResponse.json({
    success: true,
    recipientId,
    notifications,
  });
}
