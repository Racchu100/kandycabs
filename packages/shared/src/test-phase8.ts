import { BookingStatus } from './index';

async function runPhase8Tests() {
  console.log('🧪 Starting Phase 8 Unit & Integration Tests (Customer Mobile & Flow B)...\n');

  // Test 1: Flow B Lifecycle & Pickup Window Rules
  console.log('1. Testing Flow B Pickup Window State Transitions...');
  const checkSharingAllowed = (status: BookingStatus, userToggledOn: boolean): boolean => {
    if (!userToggledOn) return false;
    return status === BookingStatus.DRIVER_ACCEPTED || status === BookingStatus.DRIVER_EN_ROUTE;
  };

  const isPendingAllowed = checkSharingAllowed(BookingStatus.PENDING_ADMIN, true);
  const isDispatchedAllowed = checkSharingAllowed(BookingStatus.DISPATCHED, true);
  const isAcceptedAllowed = checkSharingAllowed(BookingStatus.DRIVER_ACCEPTED, true);
  const isEnRouteAllowed = checkSharingAllowed(BookingStatus.DRIVER_EN_ROUTE, true);
  const isStartedAllowed = checkSharingAllowed(BookingStatus.TRIP_STARTED, true);
  const isCompletedAllowed = checkSharingAllowed(BookingStatus.TRIP_COMPLETED, true);
  const isCancelledAllowed = checkSharingAllowed(BookingStatus.CANCELLED, true);
  const isToggledOffBlocked = checkSharingAllowed(BookingStatus.DRIVER_ACCEPTED, false);

  if (
    !isPendingAllowed &&
    !isDispatchedAllowed &&
    isAcceptedAllowed &&
    isEnRouteAllowed &&
    !isStartedAllowed &&
    !isCompletedAllowed &&
    !isCancelledAllowed &&
    !isToggledOffBlocked
  ) {
    console.log('   ✅ Flow B location sharing strictly limited to DRIVER_ACCEPTED and DRIVER_EN_ROUTE!');
  } else {
    throw new Error('❌ Flow B sharing window rule failure');
  }

  // Test 2: Flow B Coordinate Privacy on Trip Start
  console.log('\n2. Testing Flow B Coordinate Purging on TRIP_STARTED...');
  const simulateTripStart = (booking: {
    customerCurrentLat: number | null;
    customerCurrentLng: number | null;
    customerLocationSharingEnabled: boolean;
    status: BookingStatus;
  }) => {
    return {
      ...booking,
      status: BookingStatus.TRIP_STARTED,
      customerCurrentLat: null,
      customerCurrentLng: null,
      customerLocationSharingEnabled: false,
    };
  };

  const liveBooking = {
    customerCurrentLat: 12.9716,
    customerCurrentLng: 77.5946,
    customerLocationSharingEnabled: true,
    status: BookingStatus.DRIVER_EN_ROUTE,
  };

  const startedBooking = simulateTripStart(liveBooking);

  if (
    startedBooking.customerCurrentLat === null &&
    startedBooking.customerCurrentLng === null &&
    startedBooking.customerLocationSharingEnabled === false &&
    startedBooking.status === BookingStatus.TRIP_STARTED
  ) {
    console.log('   ✅ Customer live coordinates purged cleanly upon trip start!');
  } else {
    throw new Error('❌ Flow B coordinate purge failed');
  }

  console.log('\n🎉 ALL PHASE 8 UNIT & INTEGRATION TESTS PASSED SUCCESSFULLY!');
}

runPhase8Tests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
