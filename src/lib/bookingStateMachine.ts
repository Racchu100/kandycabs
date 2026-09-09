export type BookingState =
  | 'DRAFT'
  | 'PENDING_PAYMENT'
  | 'PAYMENT_PROCESSING'
  | 'PAID'
  | 'CONFIRMED'
  | 'WAITING_FOR_DRIVER'
  | 'DRIVER_ASSIGNED'
  | 'OTP_PENDING'
  | 'TRIP_STARTED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'PAYMENT_FAILED';

export const VALID_TRANSITIONS: Record<BookingState, BookingState[]> = {
  DRAFT: ['PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED'],
  PENDING_PAYMENT: ['PAYMENT_PROCESSING', 'PAID', 'CONFIRMED', 'CANCELLED'],
  PAYMENT_PROCESSING: ['PAID', 'PAYMENT_FAILED', 'CONFIRMED', 'CANCELLED'],
  PAYMENT_FAILED: ['PENDING_PAYMENT', 'CANCELLED'],
  PAID: ['CONFIRMED', 'WAITING_FOR_DRIVER', 'DRIVER_ASSIGNED', 'CANCELLED'],
  CONFIRMED: ['WAITING_FOR_DRIVER', 'DRIVER_ASSIGNED', 'CANCELLED'],
  WAITING_FOR_DRIVER: ['DRIVER_ASSIGNED', 'CANCELLED'],
  DRIVER_ASSIGNED: ['OTP_PENDING', 'CANCELLED'],
  OTP_PENDING: ['TRIP_STARTED', 'CANCELLED'],
  TRIP_STARTED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [], // Terminal state
  CANCELLED: [], // Terminal state
};

export class InvalidStateTransitionError extends Error {
  constructor(from: BookingState, to: BookingState) {
    super(`Invalid booking state transition from '${from}' to '${to}'.`);
    this.name = 'InvalidStateTransitionError';
  }
}

export function canTransition(from: BookingState, to: BookingState): boolean {
  const allowed = VALID_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function transitionBookingState(
  currentState: BookingState,
  targetState: BookingState
): BookingState {
  if (!canTransition(currentState, targetState)) {
    throw new InvalidStateTransitionError(currentState, targetState);
  }
  return targetState;
}
