import assert from 'node:assert';
import {
  createPaymentOrder,
  verifyPaymentSignature,
  generateRazorpaySignature,
  verifyWebhookSignature,
} from '../src/lib/paymentEngine';

function testPhase7PaymentEngine() {
  console.log('Testing Phase 7 Production Online Payment Architecture...');

  const bookingId = 'bk_pay_test_1001';
  const amount = 378; // ₹378 advance

  // 1. Test Payment Order Creation
  const { order, isDemoMode } = createPaymentOrder(bookingId, amount, 'idemp_key_pay_1');

  assert.strictEqual(order.bookingId, bookingId);
  assert.strictEqual(order.amount, 378);
  assert.strictEqual(order.amountInPaise, 37800);
  assert.strictEqual(order.status, 'PENDING');
  console.log(`✓ Payment Order created (OrderID: ${order.orderId}, ₹378 = 37800 paise, Status: PENDING)`);

  // 2. Test Idempotency (Duplicate submission with same idempotency key)
  const { order: duplicateOrder } = createPaymentOrder(bookingId, amount, 'idemp_key_pay_1');
  assert.strictEqual(duplicateOrder.orderId, order.orderId);
  console.log('✓ Idempotency verified (Duplicate payment order request returns original order)');

  // 3. Test Valid HMAC Signature Verification (Backend Authoritative)
  const secret = 'test_secret_key_123';
  process.env.RAZORPAY_KEY_SECRET = secret;

  const paymentId = 'pay_99887766';
  const validSignature = generateRazorpaySignature(order.orderId, paymentId, secret);

  const validVerification = verifyPaymentSignature({
    razorpayOrderId: order.orderId,
    razorpayPaymentId: paymentId,
    razorpaySignature: validSignature,
    bookingId,
  });

  assert.strictEqual(validVerification.verified, true);
  assert.strictEqual(validVerification.paymentRecord?.status, 'PAID');
  assert.strictEqual(validVerification.newBookingState, 'PAID');
  console.log('✓ Authoritative HMAC SHA256 signature verification verified (State transitioned to PAID)');

  // 4. Test Invalid / Tampered Signature Rejection
  const { order: order2 } = createPaymentOrder('bk_pay_test_1002', 500);

  const invalidVerification = verifyPaymentSignature({
    razorpayOrderId: order2.orderId,
    razorpayPaymentId: 'pay_hacked',
    razorpaySignature: 'invalid_tampered_signature_string',
    bookingId: 'bk_pay_test_1002',
  });

  assert.strictEqual(invalidVerification.verified, false);
  assert.strictEqual(invalidVerification.paymentRecord?.status, 'FAILED');
  assert.strictEqual(invalidVerification.error?.includes('signature verification failed'), true);
  console.log('✓ Tampered payment signature correctly rejected by backend');

  // 5. Test Webhook HMAC Signature Verification
  const webhookSecret = 'whsec_secret_9988';
  const mockWebhookBody = JSON.stringify({
    event: 'payment.captured',
    payload: { payment: { entity: { id: paymentId, order_id: order.orderId } } },
  });

  const webhookSig = require('node:crypto')
    .createHmac('sha256', webhookSecret)
    .update(mockWebhookBody)
    .digest('hex');

  const isValidWebhook = verifyWebhookSignature(mockWebhookBody, webhookSig, webhookSecret);
  assert.strictEqual(isValidWebhook, true);
  console.log('✓ Webhook HMAC SHA256 signature verification verified');

  console.log('✓ All Phase 7 Online Payment tests passed successfully!');
}

testPhase7PaymentEngine();
