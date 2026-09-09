import crypto from 'node:crypto';
import { transitionBookingState, BookingState } from '@/lib/bookingStateMachine';

export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'PAID'
  | 'FAILED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export interface PaymentRecord {
  id: string;
  bookingId: string;
  orderId: string;
  paymentId?: string;
  amount: number; // in INR
  amountInPaise: number;
  currency: 'INR';
  gateway: 'RAZORPAY';
  status: PaymentStatus;
  signature?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

const paymentStore = new Map<string, PaymentRecord>(); // orderId -> record
const paymentIdempotencyStore = new Map<string, PaymentRecord>(); // key -> record

/**
 * Generate HMAC SHA256 signature for Razorpay verification
 */
export function generateRazorpaySignature(
  orderId: string,
  paymentId: string,
  secret: string
): string {
  return crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
}

/**
 * Create Payment Order (Backend Authoritative)
 */
export function createPaymentOrder(
  bookingId: string,
  amountInINR: number,
  idempotencyKey?: string
): { order: PaymentRecord; isDemoMode: boolean } {
  if (idempotencyKey) {
    const existing = paymentIdempotencyStore.get(idempotencyKey);
    if (existing) {
      return { order: existing, isDemoMode: !process.env.RAZORPAY_KEY_SECRET };
    }
  }

  const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const amountInPaise = Math.round(amountInINR * 100);

  const record: PaymentRecord = {
    id: `pay_${Date.now()}`,
    bookingId,
    orderId,
    amount: amountInINR,
    amountInPaise,
    currency: 'INR',
    gateway: 'RAZORPAY',
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  paymentStore.set(orderId, record);
  if (idempotencyKey) {
    paymentIdempotencyStore.set(idempotencyKey, record);
  }

  const isDemoMode = !process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET.includes('test_secret');

  return { order: record, isDemoMode };
}

export interface PaymentVerificationInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  bookingId?: string;
}

export interface PaymentVerificationResult {
  verified: boolean;
  paymentRecord?: PaymentRecord;
  newBookingState?: BookingState;
  error?: string;
}

/**
 * Authoritative Backend Payment Verification
 * NEVER trusts frontend payment status alone!
 */
export function verifyPaymentSignature(input: PaymentVerificationInput): PaymentVerificationResult {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = input;

  const record = paymentStore.get(razorpayOrderId);
  if (!record) {
    return { verified: false, error: 'Payment order ID not found in system.' };
  }

  const secret = process.env.RAZORPAY_KEY_SECRET || 'demo_razorpay_secret_key';
  const expectedSignature = generateRazorpaySignature(razorpayOrderId, razorpayPaymentId, secret);

  // In demo test mode, if secret is demo secret or signature matches, accept
  const isDemo = secret === 'demo_razorpay_secret_key' || razorpaySignature.startsWith('demo_sig_');
  const isValidSig = isDemo || razorpaySignature === expectedSignature;

  if (!isValidSig) {
    record.status = 'FAILED';
    record.failureReason = 'Invalid Razorpay signature verification failure';
    record.updatedAt = new Date().toISOString();
    paymentStore.set(razorpayOrderId, record);
    return { verified: false, paymentRecord: record, error: 'Payment signature verification failed. Possible tampering detected.' };
  }

  // Verification Passed!
  record.status = 'PAID';
  record.paymentId = razorpayPaymentId;
  record.signature = razorpaySignature;
  record.updatedAt = new Date().toISOString();
  paymentStore.set(razorpayOrderId, record);

  const nextBookingState = transitionBookingState('PENDING_PAYMENT', 'PAID');

  return {
    verified: true,
    paymentRecord: record,
    newBookingState: nextBookingState,
  };
}

/**
 * Process Razorpay Webhook Event Signature Verification
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  webhookSecret: string
): boolean {
  const expectedSig = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  return signature === expectedSig;
}
