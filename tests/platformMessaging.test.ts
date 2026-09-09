import assert from 'node:assert';
import {
  redactPhoneNumbers,
  sendMessageToBooking,
  getBookingMessages,
  getUnreadCount,
  markMessagesAsRead,
} from '../src/lib/messagingEngine';

function testPhase9PlatformMessaging() {
  console.log('Testing Phase 9 Secure Platform Messaging & Phone Redactor...');

  // 1. Test Phone Number Redaction Regex Sanitizer
  const rawText1 = 'My phone number is 9845012345 please call me.';
  const redacted1 = redactPhoneNumbers(rawText1);
  assert.strictEqual(redacted1.includes('9845012345'), false);
  assert.strictEqual(redacted1.includes('[Phone Masked for Security]'), true);
  console.log('✓ Raw 10-digit mobile number automatically redacted from chat text');

  const rawText2 = 'Contact me on +91 9900887777 or 09900887777';
  const redacted2 = redactPhoneNumbers(rawText2);
  assert.strictEqual(redacted2.includes('9900887777'), false);
  console.log('✓ International +91 formatted phone number automatically redacted');

  // 2. Test Send & Retrieve Messaging Engine
  const bookingId = 'KC-TEST-99';
  const msg = sendMessageToBooking(
    bookingId,
    'cust_rajesh',
    'CUSTOMER',
    'Rajesh B.',
    'I am standing at Bejai circle. Phone is 9845012345.'
  );

  assert.strictEqual(msg.bookingId, bookingId);
  assert.strictEqual(msg.messageText.includes('9845012345'), false);
  assert.strictEqual(msg.status, 'DELIVERED');
  console.log('✓ Secure message transmitted and saved with phone redaction');

  // 3. Test Unread Count & Read Receipt Tracking
  const unreadForDriver = getUnreadCount(bookingId, 'DRIVER');
  assert.strictEqual(unreadForDriver, 1);
  console.log('✓ Unread badge count correctly computed for driver');

  markMessagesAsRead(bookingId, 'DRIVER');
  const unreadAfterRead = getUnreadCount(bookingId, 'DRIVER');
  assert.strictEqual(unreadAfterRead, 0);
  console.log('✓ Read status updated successfully upon retrieval');

  console.log('✓ All Phase 9 Secure Platform Messaging tests passed successfully!');
}

testPhase9PlatformMessaging();
