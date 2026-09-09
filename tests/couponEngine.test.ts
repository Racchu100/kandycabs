import assert from 'node:assert';
import {
  validateCoupon,
  recordCouponRedemption,
  upsertCoupon,
  setCouponSystemEnabled,
  getCouponSystemEnabled,
} from '../src/lib/couponEngine';

function testPhase6CouponEngine() {
  console.log('Testing Phase 6 Coupon Validation & System Engine...');

  // 1. Test Valid Fixed Discount Coupon
  const fixedRes = validateCoupon({
    code: 'COASTAL200',
    bookingAmount: 1800,
    customerId: 'cust_fresh_1',
  });

  assert.strictEqual(fixedRes.valid, true);
  assert.strictEqual(fixedRes.discountAmount, 200);
  assert.strictEqual(fixedRes.updatedFare, 1600);
  console.log('✓ Valid Fixed Discount Coupon verified (₹200 off ₹1800 = ₹1600)');

  // 2. Test Valid Percentage Discount Coupon (10% on ₹2500 = ₹250)
  const percRes = validateCoupon({
    code: 'FIRST10',
    bookingAmount: 2500,
    customerId: 'cust_fresh_2',
  });

  assert.strictEqual(percRes.valid, true);
  assert.strictEqual(percRes.discountAmount, 250);
  assert.strictEqual(percRes.updatedFare, 2250);
  console.log('✓ Valid Percentage Discount Coupon verified (10% off ₹2500 = ₹2250)');

  // 3. Test Expired Coupon Code
  const expiredRes = validateCoupon({
    code: 'EXPIRED50',
    bookingAmount: 1500,
  });

  assert.strictEqual(expiredRes.valid, false);
  assert.strictEqual(expiredRes.reason?.includes('expired'), true);
  console.log('✓ Expired coupon code correctly rejected with clear reason');

  // 4. Test Inactive / Disabled Coupon
  const inactiveRes = validateCoupon({
    code: 'INACTIVE',
    bookingAmount: 1500,
  });

  assert.strictEqual(inactiveRes.valid, false);
  assert.strictEqual(inactiveRes.reason?.includes('deactivated'), true);
  console.log('✓ Inactive coupon code correctly rejected with clear reason');

  // 5. Test Minimum Booking Amount Enforcement
  const minAmtRes = validateCoupon({
    code: 'COASTAL200', // Requires min ₹1000
    bookingAmount: 800, // Below min ₹1000
  });

  assert.strictEqual(minAmtRes.valid, false);
  assert.strictEqual(minAmtRes.reason?.includes('Minimum booking value'), true);
  console.log('✓ Minimum booking amount restriction enforced');

  // 6. Test Total Usage Limit
  upsertCoupon({
    id: 'coup_limit_test',
    code: 'LIMITED1',
    isActive: true,
    discountType: 'FIXED',
    discountValue: 100,
    minBookingAmount: 500,
    maxDiscount: 100,
    startDate: '2026-01-01T00:00:00Z',
    endDate: '2026-12-31T23:59:59Z',
    totalUsageLimit: 1, // Only 1 use allowed!
    perCustomerLimit: 5,
    totalUses: 1, // Already used once!
    customerUsesMap: {},
    applicableTripModes: ['ALL'],
  });

  const totalLimitRes = validateCoupon({
    code: 'LIMITED1',
    bookingAmount: 1000,
  });

  assert.strictEqual(totalLimitRes.valid, false);
  assert.strictEqual(totalLimitRes.reason?.includes('maximum total redemptions limit'), true);
  console.log('✓ Total usage limit enforcement verified');

  // 7. Test Per-Customer Usage Limit
  upsertCoupon({
    id: 'coup_cust_limit_test',
    code: 'ONETIME',
    isActive: true,
    discountType: 'FIXED',
    discountValue: 150,
    minBookingAmount: 500,
    maxDiscount: 150,
    startDate: '2026-01-01T00:00:00Z',
    endDate: '2026-12-31T23:59:59Z',
    totalUsageLimit: 1000,
    perCustomerLimit: 1, // 1 per customer
    totalUses: 5,
    customerUsesMap: { cust_repeat: 1 }, // cust_repeat used it once
    applicableTripModes: ['ALL'],
  });

  const custLimitRes = validateCoupon({
    code: 'ONETIME',
    bookingAmount: 1000,
    customerId: 'cust_repeat',
  });

  assert.strictEqual(custLimitRes.valid, false);
  assert.strictEqual(custLimitRes.reason?.includes('already redeemed coupon code'), true);
  console.log('✓ Per-customer usage limit enforcement verified');

  // 8. Test Global Coupon System Master Switch
  setCouponSystemEnabled(false);
  assert.strictEqual(getCouponSystemEnabled(), false);

  const disabledSystemRes = validateCoupon({
    code: 'COASTAL200',
    bookingAmount: 2000,
  });

  assert.strictEqual(disabledSystemRes.valid, false);
  assert.strictEqual(disabledSystemRes.reason?.includes('currently disabled by administrator'), true);
  console.log('✓ Global Coupon System master switch disable toggle verified');

  // Re-enable system after test
  setCouponSystemEnabled(true);
  assert.strictEqual(getCouponSystemEnabled(), true);

  console.log('✓ All Phase 6 Coupon System tests passed successfully!');
}

testPhase6CouponEngine();
