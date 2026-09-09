import assert from 'node:assert';
import {
  canTransition,
  transitionBookingState,
  InvalidStateTransitionError,
} from '../src/lib/bookingStateMachine';

function testBookingStateMachine() {
  console.log('Testing Booking State Machine...');

  assert.strictEqual(canTransition('DRAFT', 'PENDING_PAYMENT'), true);
  assert.strictEqual(canTransition('DRAFT', 'CONFIRMED'), true);
  assert.strictEqual(canTransition('PENDING_PAYMENT', 'PAYMENT_PROCESSING'), true);
  assert.strictEqual(canTransition('PAYMENT_PROCESSING', 'PAID'), true);
  assert.strictEqual(canTransition('CONFIRMED', 'DRIVER_ASSIGNED'), true);
  assert.strictEqual(canTransition('DRIVER_ASSIGNED', 'OTP_PENDING'), true);
  assert.strictEqual(canTransition('OTP_PENDING', 'TRIP_STARTED'), true);
  assert.strictEqual(canTransition('TRIP_STARTED', 'COMPLETED'), true);

  assert.strictEqual(canTransition('DRAFT', 'COMPLETED'), false);
  assert.strictEqual(canTransition('COMPLETED', 'DRAFT'), false);
  assert.strictEqual(canTransition('CANCELLED', 'CONFIRMED'), false);

  assert.throws(() => {
    transitionBookingState('DRAFT', 'COMPLETED');
  }, InvalidStateTransitionError);

  console.log('✓ Booking State Machine tests passed successfully!');
}

testBookingStateMachine();
