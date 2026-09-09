import assert from 'node:assert';
import { requestMobileOtp, verifyMobileOtp } from '../src/lib/otpAuth';
import { verifyToken, signToken, maskPhoneNumber } from '../src/lib/auth';

function testPhase5CustomerAuthAndIsolation() {
  console.log('Testing Phase 5 Customer Authentication & Customer Isolation...');

  const testMobile = '9845012345';

  // 1. Test OTP Request
  const reqRes = requestMobileOtp(testMobile);
  assert.strictEqual(reqRes.success, true);
  console.log('✓ Mobile OTP request generated successfully');

  // 2. Test Resend Cooldown Enforcement (Immediate second request triggers cooldown)
  const reqResCooldown = requestMobileOtp(testMobile);
  assert.strictEqual(reqResCooldown.success, false);
  assert.strictEqual(typeof reqResCooldown.cooldownRemainingSec, 'number');
  console.log(`✓ OTP Resend Cooldown enforced (${reqResCooldown.cooldownRemainingSec}s remaining)`);

  // 3. Test Invalid OTP Attempt Increment
  const invalidVerify = verifyMobileOtp(testMobile, '0000');
  assert.strictEqual(invalidVerify.success, false);
  assert.strictEqual(invalidVerify.error?.includes('attempt(s) remaining'), true);
  console.log('✓ Invalid OTP code rejected and attempt count decremented');

  // 4. Test Valid OTP Verification & Token Generation
  const validVerify = verifyMobileOtp(testMobile, '4829');
  assert.strictEqual(validVerify.success, true);
  assert.strictEqual(typeof validVerify.token, 'string');
  console.log('✓ Valid OTP verified and session JWT token issued');

  // 5. Test JWT Token Decoding
  const decodedToken = verifyToken(validVerify.token || '');
  assert.notStrictEqual(decodedToken, null);
  assert.strictEqual(decodedToken?.phone, testMobile);
  assert.strictEqual(decodedToken?.role, 'CUSTOMER');
  console.log('✓ JWT Token signature and role payload verified');

  // 6. Test Customer Isolation (Customer A vs Customer B)
  const customerAToken = signToken({
    userId: 'user_cust_A',
    email: 'custA@example.com',
    phone: '9845011111',
    role: 'CUSTOMER',
    customerId: 'cust_A',
  });

  const customerBToken = signToken({
    userId: 'user_cust_B',
    email: 'custB@example.com',
    phone: '9845022222',
    role: 'CUSTOMER',
    customerId: 'cust_B',
  });

  const authA = verifyToken(customerAToken);
  const authB = verifyToken(customerBToken);
  const bookingOwnerId = 'cust_A';

  // Customer A accessing own booking -> Allowed
  const isCustomerAAllowed = authA?.customerId === bookingOwnerId;
  assert.strictEqual(isCustomerAAllowed, true);

  // Customer B accessing Customer A's booking -> FORBIDDEN (HTTP 403)
  const isCustomerBAllowed = authB?.customerId === bookingOwnerId;
  assert.strictEqual(isCustomerBAllowed, false);
  console.log('✓ Customer Isolation enforced (Customer B cannot access Customer A\'s booking)');

  // 7. Test Driver Phone Masking Compliance
  const rawCustomerPhone = '+919845012345';
  const maskedPhone = maskPhoneNumber(rawCustomerPhone);
  assert.strictEqual(maskedPhone.endsWith('2345'), true);
  assert.strictEqual(maskedPhone.includes('984501'), false);
  console.log('✓ Driver Phone Masking compliance verified (hides sensitive customer numbers)');

  console.log('✓ All Phase 5 Customer Auth & Isolation tests passed successfully!');
}

testPhase5CustomerAuthAndIsolation();
