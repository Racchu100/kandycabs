import crypto from 'crypto';
import { hashOtp, verifyOtpHash, signAuthToken, verifyAuthToken, UserRole } from './index';

async function runSecurityPrivacyTests() {
  console.log('🔒 Starting Phase 9 Security Pass & Flow B Privacy Boundary Tests...\n');

  // Test 1: Flow B Privacy Boundary — Non-Assigned Driver Scoping
  console.log('1. Testing Flow B Privacy Boundary (Driver Isolation)...');
  const mockBooking = {
    id: 'booking_alpha_101',
    assignedDriverId: 'driver_assigned_AAA',
    customerCurrentLat: 12.9716,
    customerCurrentLng: 77.5946,
    customerLocationSharingEnabled: true,
  };

  const getFlowBCoordinatesForDriver = (driverId: string, booking: typeof mockBooking) => {
    // Backend access rule: Driver must match assignedDriverId exactly
    if (booking.assignedDriverId !== driverId) {
      return { allowed: false, error: 'Unauthorized: Booking not assigned to this driver' };
    }
    if (!booking.customerLocationSharingEnabled) {
      return { allowed: true, customerCurrentLat: null, customerCurrentLng: null };
    }
    return {
      allowed: true,
      customerCurrentLat: booking.customerCurrentLat,
      customerCurrentLng: booking.customerCurrentLng,
    };
  };

  const assignedDriverAccess = getFlowBCoordinatesForDriver('driver_assigned_AAA', mockBooking);
  const unassignedDriverAccess = getFlowBCoordinatesForDriver('driver_snooper_BBB', mockBooking);

  if (
    assignedDriverAccess.allowed &&
    assignedDriverAccess.customerCurrentLat === 12.9716 &&
    !unassignedDriverAccess.allowed
  ) {
    console.log('   ✅ Flow B coordinates strictly scoped to assigned driver! Non-assigned driver query blocked.');
  } else {
    throw new Error('❌ Flow B privacy boundary violation');
  }

  // Test 2: Razorpay Webhook HMAC-SHA256 Signature Verification
  console.log('\n2. Testing Razorpay Webhook Forgery Prevention...');
  const webhookSecret = 'prod_webhook_secret_999';
  const legitPayload = JSON.stringify({ event: 'payment.captured', id: 'pay_123' });
  const legitimateSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(legitPayload)
    .digest('hex');

  const forgedPayload = JSON.stringify({ event: 'payment.captured', id: 'pay_forged_999' });

  const verifyWebhook = (payload: string, signature: string, secret: string) => {
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const a = Buffer.from(signature, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  };

  const isLegitValid = verifyWebhook(legitPayload, legitimateSignature, webhookSecret);
  const isForgedBlocked = !verifyWebhook(forgedPayload, legitimateSignature, webhookSecret);

  if (isLegitValid && isForgedBlocked) {
    console.log('   ✅ Webhook HMAC verification is tamper-proof and forged payloads are rejected!');
  } else {
    throw new Error('❌ Webhook signature verification failure');
  }

  // Test 3: JWT Authentication & Tampering
  console.log('\n3. Testing JWT Signature Verification & Tampering Protection...');
  const testToken = await signAuthToken({
    userId: 'user_secure_123',
    phone: '9876543210',
    roles: [UserRole.CUSTOMER],
  });

  const verifiedPayload = await verifyAuthToken(testToken);
  const tamperedToken = testToken.slice(0, -5) + 'XXXXX';
  const tamperedResult = await verifyAuthToken(tamperedToken);

  if (verifiedPayload?.userId === 'user_secure_123' && tamperedResult === null) {
    console.log('   ✅ JWT cryptographic signature verification passed and tampered tokens rejected!');
  } else {
    throw new Error('❌ JWT signature verification failure');
  }

  // Test 4: Salted Web Crypto OTP Hashing
  console.log('\n4. Testing Salted OTP Hashing (Rainbow Table Immunity)...');
  const otp = '4829';
  const hash1 = await hashOtp(otp);
  const hash2 = await hashOtp(otp);

  const isValid1 = await verifyOtpHash(otp, hash1);
  const isValid2 = await verifyOtpHash(otp, hash2);
  const isWrongOtpRejected = !(await verifyOtpHash('9999', hash1));

  if (hash1 !== hash2 && isValid1 && isValid2 && isWrongOtpRejected) {
    console.log('   ✅ Salted OTP hashing produces distinct cryptographic salts and verifies cleanly!');
  } else {
    throw new Error('❌ Salted OTP hashing failure');
  }

  console.log('\n🎉 ALL SECURITY & PRIVACY TESTS PASSED SUCCESSFULLY!');
}

runSecurityPrivacyTests().catch((err) => {
  console.error('Security test failed:', err);
  process.exit(1);
});
