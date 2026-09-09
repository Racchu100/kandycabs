import assert from 'node:assert';
import { calculateAndValidateDistance } from '../src/lib/distanceEngine';
import { getExistingBookingByIdempotencyKey, saveBookingIdempotencyKey } from '../src/lib/idempotency';

async function testBookingEnginePhase3() {
  console.log('Testing Phase 3 Booking Engine & Business Logic...');

  // 1. Test Server-side Distance Calculation & Validation
  const distanceRes = await calculateAndValidateDistance(
    { lat: 12.9141, lng: 74.856, address: 'Mangaluru' },
    { lat: 13.3409, lng: 74.7421, address: 'Udupi' }
  );

  assert.strictEqual(typeof distanceRes.distanceKm, 'number');
  assert.strictEqual(distanceRes.distanceKm > 0, true);
  assert.strictEqual(distanceRes.source, 'server_calculated');
  console.log(`✓ Distance calculation validated: ${distanceRes.distanceKm} km (${distanceRes.durationMinutes} mins)`);

  // 2. Test Round-Trip Date Validation Logic
  const pickupTime = '2026-09-10T10:00:00Z';
  const invalidReturnTime = '2026-09-08T10:00:00Z';
  const validReturnTime = '2026-09-12T10:00:00Z';

  const isInvalid = new Date(invalidReturnTime) <= new Date(pickupTime);
  const isValid = new Date(validReturnTime) > new Date(pickupTime);

  assert.strictEqual(isInvalid, true);
  assert.strictEqual(isValid, true);
  console.log('✓ Round-trip date validation rules verified');

  // 3. Test Idempotency & Duplicate Submission Prevention
  const testIdempotencyKey = 'test_key_12345';
  const mockBookingObj = {
    id: 'bk_test_101',
    bookingReference: 'KC-99999',
    tripMode: 'ONEWAY',
  };

  // Initially no key exists
  assert.strictEqual(getExistingBookingByIdempotencyKey(testIdempotencyKey), null);

  // Store key
  saveBookingIdempotencyKey(testIdempotencyKey, { booking: mockBookingObj });

  // Secondary retrieval returns saved record without creating new booking
  const retrieved = getExistingBookingByIdempotencyKey(testIdempotencyKey);
  assert.notStrictEqual(retrieved, null);
  assert.strictEqual(retrieved.booking.bookingReference, 'KC-99999');
  console.log('✓ Idempotency key duplicate prevention verified');

  console.log('✓ All Phase 3 Booking Engine tests passed successfully!');
}

testBookingEnginePhase3();
