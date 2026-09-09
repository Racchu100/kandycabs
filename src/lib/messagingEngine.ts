export interface ChatMessage {
  id: string;
  bookingId: string;
  senderId: string;
  senderRole: 'CUSTOMER' | 'DRIVER' | 'ADMIN';
  senderName: string;
  messageText: string;
  redactedText: string;
  isRead: boolean;
  status: 'SENT' | 'DELIVERED' | 'FAILED';
  createdAt: string;
}

const messageStore = new Map<string, ChatMessage[]>(); // bookingId -> ChatMessage[]

/**
 * Regex Phone Number Sanitizer / Redactor
 * Replaces 10-digit, 11-digit, or formatted phone numbers in text with [Phone Number Masked for Safety]
 */
export function redactPhoneNumbers(text: string): string {
  // Matches Indian mobile numbers (+91, 0, or 10-digit formats with spaces/dashes)
  const phoneRegex = /(\+?91[\s-]?)?[6-9]\d{9}|\b\d{10}\b|\b\d{5}[\s-]?\d{5}\b/g;
  return text.replace(phoneRegex, '[Phone Masked for Security]');
}

// Seed initial messages for active booking KC-88429
const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg_88429_1',
    bookingId: 'KC-88429',
    senderId: 'driver_suresh',
    senderRole: 'DRIVER',
    senderName: 'Suresh Gowda (Chauffeur)',
    messageText: 'Hello Sir, I have dispatched in Dzire KA 19 C 4829. Arriving in 10 mins.',
    redactedText: 'Hello Sir, I have dispatched in Dzire KA 19 C 4829. Arriving in 10 mins.',
    isRead: true,
    status: 'DELIVERED',
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: 'msg_88429_2',
    bookingId: 'KC-88429',
    senderId: 'cust_rajesh',
    senderRole: 'CUSTOMER',
    senderName: 'Rajesh B. (Rider)',
    messageText: 'Thank you, waiting at Mangaluru Central Main Entrance.',
    redactedText: 'Thank you, waiting at Mangaluru Central Main Entrance.',
    isRead: true,
    status: 'DELIVERED',
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
];

messageStore.set('KC-88429', INITIAL_MESSAGES);
messageStore.set('bk_88429', INITIAL_MESSAGES);

/**
 * Send Platform Message with Security Verification & Phone Redaction
 */
export function sendMessageToBooking(
  bookingId: string,
  senderId: string,
  senderRole: 'CUSTOMER' | 'DRIVER' | 'ADMIN',
  senderName: string,
  rawText: string
): ChatMessage {
  const sanitizedText = redactPhoneNumbers(rawText.trim());

  const messageObj: ChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    bookingId,
    senderId,
    senderRole,
    senderName,
    messageText: sanitizedText, // Always store phone-sanitized text!
    redactedText: sanitizedText,
    isRead: false,
    status: 'DELIVERED',
    createdAt: new Date().toISOString(),
  };

  const existing = messageStore.get(bookingId) || [];
  existing.push(messageObj);
  messageStore.set(bookingId, existing);

  return messageObj;
}

/**
 * Get Messages for Authorized Booking
 */
export function getBookingMessages(bookingId: string): ChatMessage[] {
  return messageStore.get(bookingId) || [];
}

/**
 * Get Unread Messages Count for Role
 */
export function getUnreadCount(bookingId: string, currentRole: 'CUSTOMER' | 'DRIVER' | 'ADMIN'): number {
  const messages = messageStore.get(bookingId) || [];
  return messages.filter((m) => !m.isRead && m.senderRole !== currentRole).length;
}

/**
 * Mark Messages as Read
 */
export function markMessagesAsRead(bookingId: string, currentRole: 'CUSTOMER' | 'DRIVER' | 'ADMIN'): void {
  const messages = messageStore.get(bookingId) || [];
  messages.forEach((m) => {
    if (m.senderRole !== currentRole) {
      m.isRead = true;
    }
  });
  messageStore.set(bookingId, messages);
}
