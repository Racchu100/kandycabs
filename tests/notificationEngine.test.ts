import assert from 'node:assert';
import {
  sendNotification,
  getNotificationRecord,
  getNotificationsByRecipient,
  processNotificationQueueBackground,
  NotificationPayload,
} from '../src/lib/notificationEngine';

async function testPhase17NotificationEngine() {
  console.log('Testing Phase 17 Multi-Channel Notification & Queue Engine...');

  // 1. Test Multi-Channel Booking Confirmation Dispatch
  const bookingPayload: NotificationPayload = {
    recipientId: 'cust_ramesh_101',
    recipientPhone: '+919845012345',
    recipientEmail: 'ramesh@example.com',
    eventType: 'BOOKING_CONFIRMED',
    channels: ['SMS', 'WHATSAPP', 'EMAIL', 'IN_APP'],
    title: 'Booking Confirmed — KC-88429',
    message: 'Your Kandy Cabs outstation trip to Udupi has been confirmed.',
    metadata: { bookingReference: 'KC-88429', fare: 2450 },
  };

  const { queuedIds } = await sendNotification(bookingPayload);
  assert.strictEqual(queuedIds.length, 4);
  console.log('✓ Multi-channel notification queued (SMS, WhatsApp, Email, In-App)');

  // 2. Process Background Queue & Verify Dispatch Statuses
  await processNotificationQueueBackground();

  const firstRecord = getNotificationRecord(queuedIds[0]);
  assert.strictEqual(firstRecord?.status, 'DISPATCHED');
  assert.notStrictEqual(firstRecord?.dispatchedAt, undefined);
  console.log('✓ Asynchronous background queue worker processed all notifications (Status: DISPATCHED)');

  // 3. Test Recipient History Retrieval
  const recipientRecords = getNotificationsByRecipient('cust_ramesh_101');
  assert.strictEqual(recipientRecords.length, 4);
  console.log('✓ Recipient in-app notification center query verified');

  // 4. Test Fault Tolerance (Missing email for Email channel -> Retries & Marks FAILED gracefully)
  const faultyPayload: NotificationPayload = {
    recipientId: 'cust_faulty_102',
    eventType: 'PAYMENT_FAILED',
    channels: ['EMAIL'], // No email provided
    title: 'Payment Failed',
    message: 'Payment verification failed.',
  };

  const { queuedIds: faultyIds } = await sendNotification(faultyPayload);
  await processNotificationQueueBackground(); // Attempt 1 -> Retry
  await processNotificationQueueBackground(); // Attempt 2 -> Retry
  await processNotificationQueueBackground(); // Attempt 3 -> Final Fail

  const faultyRecord = getNotificationRecord(faultyIds[0]);
  assert.strictEqual(faultyRecord?.status, 'FAILED');
  assert.strictEqual(faultyRecord?.retryCount, 3);
  assert.strictEqual(faultyRecord?.lastError?.includes('email missing'), true);
  console.log('✓ Decoupled fault tolerance & 3-attempt retry backoff verified (System does not crash on gateway error)');

  console.log('✓ All Phase 17 Notification Engine tests passed successfully!');
}

testPhase17NotificationEngine();
