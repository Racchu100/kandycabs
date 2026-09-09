import assert from 'assert';
import { validateCoupon } from '../src/lib/couponEngine';

console.log('🧪 Starting Coupon Payment Section Integration Test...');

// 1. Validate active valid coupon COASTAL200
const validRes = validateCoupon({
  code: 'COASTAL200',
  bookingAmount: 1500,
  customerId: 'cust_test_999',
  tripMode: 'ONEWAY',
});

assert.strictEqual(validRes.valid, true);
assert.strictEqual(validRes.code, 'COASTAL200');
assert.strictEqual(validRes.discountAmount, 200);
assert.strictEqual(validRes.updatedFare, 1300);

// 2. Validate percentage coupon FIRST10 (10% off)
const pctRes = validateCoupon({
  code: 'FIRST10',
  bookingAmount: 2000,
  customerId: 'cust_test_888',
  tripMode: 'ONEWAY',
});

assert.strictEqual(pctRes.valid, true);
assert.strictEqual(pctRes.discountAmount, 200); // 10% of 2000 = 200
assert.strictEqual(pctRes.updatedFare, 1800);

// 3. Invalid coupon code test
const invalidRes = validateCoupon({
  code: 'INVALIDCODE99',
  bookingAmount: 1500,
  customerId: 'cust_test_999',
  tripMode: 'ONEWAY',
});

assert.strictEqual(invalidRes.valid, false);
assert(invalidRes.reason?.includes('invalid'), 'Should specify invalid reason');

console.log('✅ Coupon Payment Section Integration Test Passed 100%!');
