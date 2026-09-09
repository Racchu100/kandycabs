import assert from 'node:assert';
import {
  acceptTripAtomic,
  startTripWithOtp,
  completeTripWithMeter,
  getAvailableTrips,
} from '../src/lib/driverTripManager';
import { updateBookingTollCharges } from '../src/lib/adminEngine';

function testPhase8DriverOperationalEngine() {
  console.log('Testing Phase 8 Driver Operational Interface & Atomic Locks...');

  const tripId = 'trip_avail_101';

  // 1. Test Available Trips Discovery
  const available = getAvailableTrips();
  assert.strictEqual(available.length > 0, true);
  console.log(`✓ Driver available trips query verified (${available.length} available trip found)`);

  // 2. Test Atomic Trip Acceptance Lock (Driver A succeeds)
  const driverARes = acceptTripAtomic(
    tripId,
    'driver_suresh',
    'Suresh Gowda',
    'KA 19 C 4829'
  );

  assert.strictEqual(driverARes.success, true);
  assert.strictEqual(driverARes.trip?.status, 'DRIVER_ASSIGNED');
  assert.strictEqual(driverARes.trip?.assignedDriverId, 'driver_suresh');
  console.log('✓ Atomic Trip Acceptance locked successfully for Driver A');

  // 3. Test Race Condition Protection (Driver B attempting to accept SAME trip)
  const driverBRes = acceptTripAtomic(
    tripId,
    'driver_ramesh',
    'Ramesh Shetty',
    'KA 19 C 9900'
  );

  assert.strictEqual(driverBRes.success, false);
  assert.strictEqual(
    driverBRes.error?.includes('already been accepted by another chauffeur'),
    true
  );
  console.log('✓ Atomic Race Condition Protection verified (Driver B blocked from accepting Driver A\'s trip)');

  // 4. Test Customer Phone Masking Privacy Enforcement
  const customerPhone = driverARes.trip?.maskedCustomerPhone;
  assert.strictEqual(customerPhone?.endsWith('2345'), true);
  assert.strictEqual(customerPhone?.includes('984501'), false);
  console.log('✓ Driver Privacy enforcement verified (Customer phone masked on driver UI)');

  // 5. Test Invalid OTP Rejection during Trip Start
  const invalidOtpRes = startTripWithOtp(tripId, '0000', 12450);
  assert.strictEqual(invalidOtpRes.success, false);
  assert.strictEqual(invalidOtpRes.error?.includes('Invalid Customer OTP'), true);
  console.log('✓ Invalid Customer OTP code correctly rejected');

  // 6. Test Valid OTP Verification & Pickup Meter Capture
  // Trip startOtp is "5120"
  const validStartRes = startTripWithOtp(tripId, '5120', 12450);
  assert.strictEqual(validStartRes.success, true);
  assert.strictEqual(validStartRes.trip?.status, 'TRIP_STARTED');
  assert.strictEqual(validStartRes.trip?.initialMeterKm, 12450);
  console.log('✓ Valid OTP verified and initial Odometer reading (12,450 km) recorded');

  // 7. Test Drop Meter Capture & Trip Completion
  const completeRes = completeTripWithMeter(tripId, 12535); // 85 km driven
  assert.strictEqual(completeRes.success, true);
  assert.strictEqual(completeRes.trip?.status, 'COMPLETED');
  assert.strictEqual(completeRes.trip?.actualDistanceKm, 85);
  console.log('✓ Drop Odometer reading (12,535 km) recorded, actual distance 85 km calculated, state transitioned to COMPLETED');

  // 8. Test Toll Charges & FASTag Receipt Entry
  const tollRes = updateBookingTollCharges('KC-99011', 250, 'data:image/jpeg;base64,mockTollReceipt');
  assert.strictEqual(tollRes.success, true);
  assert.strictEqual(tollRes.booking?.tollCharges, 250);
  assert.strictEqual(tollRes.booking?.tollReceiptImage, 'data:image/jpeg;base64,mockTollReceipt');
  assert.strictEqual(
    tollRes.booking?.remainingFare,
    Math.max(0, (tollRes.booking?.estimatedFare || 0) + 250 - (tollRes.booking?.advancePaid || 0))
  );
  console.log('✓ Toll charges update & dynamic customer balance recalculation verified');

  console.log('✓ All Phase 8 Driver Operational Engine tests passed successfully!');
}

testPhase8DriverOperationalEngine();
