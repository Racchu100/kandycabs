import { maskPhoneNumber } from '@/lib/auth';
import { transitionBookingState, BookingState } from '@/lib/bookingStateMachine';
import { recordDriverApproval } from '@/lib/adminEngine';

export interface DriverTripRecord {
  id: string;
  bookingReference: string;
  tripMode: string;
  tripDays?: number;
  pickupAddress: string;
  dropAddress: string;
  pickupTime: string;
  passengers: number;
  customerName: string;
  maskedCustomerPhone: string;
  assignedDriverId?: string;
  driverName?: string;
  vehicleRegistration?: string;
  status: BookingState;
  statusLabel: string;
  estimatedFare: number;
  advancePaid: number;
  remainingFare: number;
  startOtp: string; // Customer OTP to verify
  initialMeterKm?: number;
  initialMeterImage?: string;
  finalMeterKm?: number;
  finalMeterImage?: string;
  actualDistanceKm?: number;
  createdAt: string;
}

const mockTripsStore = new Map<string, DriverTripRecord>();

// Initial trip records (Empty for fresh start)
const INITIAL_TRIPS: DriverTripRecord[] = [
  {
    id: 'trip_avail_101',
    bookingReference: 'KC-2026-9910',
    tripMode: 'Outstation Round Trip',
    tripDays: 2,
    pickupAddress: 'Mangaluru Central Railway Station, Mangaluru',
    dropAddress: 'Udupi Sri Krishna Matha, Udupi',
    pickupTime: '2026-09-10 08:00 AM',
    passengers: 4,
    customerName: 'Anil Kumar',
    maskedCustomerPhone: maskPhoneNumber('9845012345'),
    status: 'WAITING_FOR_DRIVER',
    statusLabel: 'Awaiting Driver Assignment',
    estimatedFare: 4500,
    advancePaid: 1000,
    remainingFare: 3500,
    startOtp: '5120',
    createdAt: new Date().toISOString(),
  },
];

INITIAL_TRIPS.forEach((t) => mockTripsStore.set(t.id, t));

export function getAvailableTrips(): DriverTripRecord[] {
  return Array.from(mockTripsStore.values()).filter(
    (t) => t.status === 'WAITING_FOR_DRIVER' && !t.assignedDriverId
  );
}

export function getDriverTrips(driverId: string): DriverTripRecord[] {
  return Array.from(mockTripsStore.values()).filter(
    (t) => t.assignedDriverId === driverId
  );
}

/**
 * ATOMIC TRIP ACCEPTANCE
 * Locks trip to driver using atomic state check to prevent race conditions!
 */
export function acceptTripAtomic(
  tripId: string,
  driverId: string,
  driverName: string,
  vehicleRegistration: string
): { success: boolean; trip?: DriverTripRecord; error?: string } {
  let trip = mockTripsStore.get(tripId);

  if (!trip && (tripId === 'trip_avail_101' || tripId === 'KC-99011')) {
    trip = {
      id: 'trip_avail_101',
      bookingReference: 'KC-99011',
      tripMode: 'One-Way Outstation',
      pickupAddress: 'KSRTC Bus Stand, Bejai, Mangaluru',
      dropAddress: 'Kollur Mookambika Temple',
      pickupTime: 'Today at 04:00 PM',
      passengers: 3,
      customerName: 'Anand Kumar',
      maskedCustomerPhone: maskPhoneNumber('+919845012345'),
      status: 'WAITING_FOR_DRIVER',
      statusLabel: 'Available for Acceptance',
      estimatedFare: 3400,
      advancePaid: 680,
      remainingFare: 2720,
      startOtp: '5120',
      createdAt: new Date().toISOString(),
    };
    mockTripsStore.set(tripId, trip);
  }

  if (!trip) {
    return { success: false, error: 'Trip not found.' };
  }

  // Atomic race condition check
  if (trip.assignedDriverId && trip.assignedDriverId !== driverId) {
    return {
      success: false,
      error: 'Trip has already been accepted by another chauffeur.',
    };
  }

  if (trip.status !== 'WAITING_FOR_DRIVER') {
    return {
      success: false,
      error: 'Trip is no longer available for acceptance.',
    };
  }

  // Atomic Assignment
  trip.assignedDriverId = driverId;
  trip.driverName = driverName;
  trip.vehicleRegistration = vehicleRegistration;
  trip.status = transitionBookingState('WAITING_FOR_DRIVER', 'DRIVER_ASSIGNED');
  trip.statusLabel = 'Approved & Assigned — En Route to Pickup Location';

  mockTripsStore.set(tripId, trip);

  // Sync approval state with Admin Master Console
  recordDriverApproval(trip.bookingReference, driverId, driverName, vehicleRegistration);

  return { success: true, trip };
}

/**
 * START TRIP WITH CUSTOMER OTP & PICKUP METER CAPTURE
 */
export function startTripWithOtp(
  tripId: string,
  customerOtp: string,
  initialMeterKm: number,
  initialMeterImage?: string
): { success: boolean; trip?: DriverTripRecord; error?: string } {
  const trip = mockTripsStore.get(tripId);
  if (!trip) return { success: false, error: 'Trip not found.' };

  if (trip.startOtp !== customerOtp.trim()) {
    return { success: false, error: 'Invalid Customer OTP code. Verification failed.' };
  }

  if (typeof initialMeterKm !== 'number' || initialMeterKm <= 0) {
    return { success: false, error: 'Valid initial meter Odometer reading is required.' };
  }

  const img = initialMeterImage || 'data:image/jpeg;base64,mockPickupOdometer';
  trip.initialMeterKm = initialMeterKm;
  trip.initialMeterImage = img;
  trip.status = transitionBookingState('OTP_PENDING', 'TRIP_STARTED');
  trip.statusLabel = 'Trip Started (In Progress)';

  mockTripsStore.set(tripId, trip);
  return { success: true, trip };
}

/**
 * COMPLETE TRIP WITH DROP METER CAPTURE
 */
export function completeTripWithMeter(
  tripId: string,
  finalMeterKm: number,
  finalMeterImage?: string
): { success: boolean; trip?: DriverTripRecord; error?: string } {
  const trip = mockTripsStore.get(tripId);
  if (!trip) return { success: false, error: 'Trip not found.' };

  if (!trip.initialMeterKm) {
    return { success: false, error: 'Trip has not recorded initial pickup meter reading.' };
  }

  if (typeof finalMeterKm !== 'number' || finalMeterKm <= trip.initialMeterKm) {
    return {
      success: false,
      error: `Final meter (${finalMeterKm} km) must be greater than initial pickup meter (${trip.initialMeterKm} km).`,
    };
  }

  const dropImg = finalMeterImage || 'data:image/jpeg;base64,mockDropoffOdometer';
  trip.finalMeterKm = finalMeterKm;
  trip.finalMeterImage = dropImg;
  const actualDistance = finalMeterKm - trip.initialMeterKm;
  trip.actualDistanceKm = actualDistance;
  trip.status = transitionBookingState('TRIP_STARTED', 'COMPLETED');
  trip.statusLabel = 'Trip Completed';

  mockTripsStore.set(tripId, trip);
  return { success: true, trip };
}

/**
 * ERASE ALL DRIVER TRIPS & ASSIGNMENTS
 */
export function clearAllDriverTrips(): void {
  mockTripsStore.clear();
}
