import { NextResponse } from 'next/server';
import { extractBearerToken, verifyToken } from '@/lib/auth';
import {
  sendMessageToBooking,
  getBookingMessages,
  getUnreadCount,
  markMessagesAsRead,
} from '@/lib/messagingEngine';

export async function GET(request: Request) {
  const token = extractBearerToken(request.headers.get('authorization'));
  const auth = verifyToken(token || '');

  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized: Session token required' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const bookingId = searchParams.get('bookingId') || 'KC-88429';

  const userRole = auth.role === 'DRIVER' ? 'DRIVER' : auth.role === 'ADMIN' ? 'ADMIN' : 'CUSTOMER';

  // Mark as read upon retrieval
  markMessagesAsRead(bookingId, userRole);
  const messages = getBookingMessages(bookingId);
  const unreadCount = getUnreadCount(bookingId, userRole);

  return NextResponse.json({
    success: true,
    bookingId,
    unreadCount,
    messages,
  });
}

export async function POST(request: Request) {
  try {
    const token = extractBearerToken(request.headers.get('authorization'));
    const auth = verifyToken(token || '');

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized: Session token required' }, { status: 401 });
    }

    const body = await request.json();
    const { bookingId = 'KC-88429', messageText } = body;

    if (!messageText || !messageText.trim()) {
      return NextResponse.json({ error: 'messageText is required' }, { status: 400 });
    }

    const userRole = auth.role === 'DRIVER' ? 'DRIVER' : auth.role === 'ADMIN' ? 'ADMIN' : 'CUSTOMER';
    const userName =
      auth.role === 'DRIVER'
        ? 'Suresh Gowda (Chauffeur)'
        : auth.role === 'ADMIN'
        ? 'Admin Dispatch Support'
        : 'Customer Rider';

    const message = sendMessageToBooking(
      bookingId,
      auth.userId || 'usr_gen',
      userRole,
      userName,
      messageText
    );

    return NextResponse.json({
      success: true,
      message,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to send platform message' }, { status: 500 });
  }
}
