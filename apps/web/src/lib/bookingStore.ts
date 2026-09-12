export interface StoredBooking {
  id: string;
  humanReadableRef: string;
  tripType: string;
  pickupAddress: string;
  dropAddress: string;
  scheduledAt: string;
  distanceKm: number;
  estimatedFare: number;
  advanceAmount: number;
  advancePaymentStatus: string;
  advancePaymentRef?: string;
  balanceAmount: number;
  balancePaymentStatus: string;
  balancePaymentRef?: string;
  tollAmount: number;
  status: string; // PENDING_ADMIN, DISPATCHED, DRIVER_ACCEPTED, STARTING, OTP_PENDING, TRIP_STARTED, ENDING, TRIP_COMPLETED, CANCELLED
  customerPhoneReleased: boolean;
  customer: {
    fullName: string;
    phone?: string;
    user?: { phone: string };
  };
  vehicle?: {
    name: string;
  };
  assignedDriver?: {
    id: string;
    fullName: string;
    user?: { phone: string };
  };
  cancellationReason?: string;
  createdAt: string;

  // Dynamic Pricing Snapshot
  fuelType?: string;
  priceSnapshot?: any;

  // Controlled Trip Lifecycle Fields
  startingOdometer?: number;
  startingOdometerImagePath?: string;
  startingOdometerTimestamp?: string;
  startLat?: number;
  startLng?: number;
  startGpsAccuracy?: number;
  startGpsTimestamp?: string;
  startLocation?: string;
  startLocationTimestamp?: string;
  tripStartedAt?: string;

  pickupOtp?: string;
  otpStatus?: 'PENDING' | 'VERIFIED' | 'ADMIN_OVERRIDE_REQUESTED' | 'ADMIN_OVERRIDE';
  otpVerifiedAt?: string;
  otpAttempts?: number;
  overrideByAdminId?: string;
  overrideReason?: string;
  overrideTimestamp?: string;
  startedBy?: 'DRIVER' | 'ADMIN';
  adminId?: string;
  adminReason?: string;
  adminStartedAt?: string;

  lastGpsLat?: number;
  lastGpsLng?: number;
  lastGpsAccuracy?: number;
  lastGpsSpeedKmh?: number;
  lastGpsLocationName?: string;
  lastGpsUpdatedAt?: string;

  confirmedPickupLat?: number;
  confirmedPickupLng?: number;
  confirmedPickupAt?: string;
  trackingStatus?: string;

  finalOdometer?: number;
  finalOdometerImagePath?: string;
  endLat?: number;
  endLng?: number;
  endGpsAccuracy?: number;
  endGpsTimestamp?: string;
  photoTimestamp?: string;
  endLocation?: string;
  endTimestamp?: string;
  tripCompletedAt?: string;
  actualDistanceKm?: number;
}

const globalForBookingStore = globalThis as unknown as {
  bookingRegistry: StoredBooking[] | undefined;
  tripTrackingLogs: Map<string, Array<{ latitude: number; longitude: number; timestamp: string; speedKmh?: number; accuracy?: number }>> | undefined;
  tripAuditLogs: Map<string, Array<{ eventType: string; actor: string; timestamp: string; metadata?: any }>> | undefined;
};

const initialSampleBookings: StoredBooking[] = [
  {
    id: 'b_kc73744',
    humanReadableRef: 'KC73744',
    tripType: 'ONEWAY',
    pickupAddress: 'Bangalore Central, Karnataka',
    dropAddress: 'Coorg (Madikeri), Karnataka',
    scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    distanceKm: 245,
    estimatedFare: 4250,
    advanceAmount: 1063,
    advancePaymentStatus: 'PAID',
    balanceAmount: 3187,
    balancePaymentStatus: 'PENDING',
    tollAmount: 0,
    status: 'PENDING_ADMIN',
    customerPhoneReleased: false,
    customer: { fullName: 'Praveen Rao', phone: '9876543210', user: { phone: '9876543210' } },
    vehicle: { name: 'Swift Dzire (Sedan)' },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'b_kc54120',
    humanReadableRef: 'KC54120',
    tripType: 'ONEWAY',
    pickupAddress: 'Bangalore Central, Karnataka',
    dropAddress: 'Mysore Palace, Mysore, Karnataka',
    scheduledAt: new Date().toISOString(),
    distanceKm: 145,
    estimatedFare: 3800,
    advanceAmount: 950,
    advancePaymentStatus: 'PAID',
    balanceAmount: 2850,
    balancePaymentStatus: 'PENDING',
    tollAmount: 120,
    status: 'DISPATCHED',
    customerPhoneReleased: true,
    customer: { fullName: 'Rajesh Kumar', phone: '9845012345', user: { phone: '9845012345' } },
    vehicle: { name: 'Sedan (Standard)' },
    assignedDriver: { id: 'd_ranju', fullName: 'Ranju', user: { phone: '8659745632' } },
    lastGpsLat: 12.8449,
    lastGpsLng: 74.8498,
    lastGpsAccuracy: 8,
    lastGpsSpeedKmh: 45,
    lastGpsLocationName: 'Kodialbail, Lalbagh, Mangaluru, 575003, Dakshina Kannada, Karnataka',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'b_kc89210',
    humanReadableRef: 'KC89210',
    tripType: 'OUTSTATION',
    pickupAddress: 'Mangaluru City, Karnataka',
    dropAddress: 'Udupi Sri Krishna Temple, Udupi',
    scheduledAt: new Date(Date.now() + 172800000).toISOString(),
    distanceKm: 60,
    estimatedFare: 2450,
    advanceAmount: 612,
    advancePaymentStatus: 'PAID',
    balanceAmount: 1838,
    balancePaymentStatus: 'PENDING',
    tollAmount: 60,
    status: 'DRIVER_ACCEPTED',
    customerPhoneReleased: true,
    customer: { fullName: 'Sunil Kumar', phone: '9481011223', user: { phone: '9481011223' } },
    vehicle: { name: 'Ertiga (SUV)' },
    assignedDriver: { id: 'd_rajesh', fullName: 'Rajesh Gowda', user: { phone: '9844011223' } },
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'b_kc61033',
    humanReadableRef: 'KC61033',
    tripType: 'AIRPORT',
    pickupAddress: 'Mangaluru International Airport (IXE)',
    dropAddress: 'Kasaragod City, Kerala',
    scheduledAt: new Date().toISOString(),
    distanceKm: 68,
    estimatedFare: 3100,
    advanceAmount: 775,
    advancePaymentStatus: 'PAID',
    balanceAmount: 2325,
    balancePaymentStatus: 'PENDING',
    tollAmount: 90,
    status: 'TRIP_STARTED',
    tripStartedAt: new Date(Date.now() - 1800000).toISOString(),
    startingOdometer: 142350,
    startingOdometerImagePath: '/uploads/sample_start_odo.jpg',
    startLat: 12.9613,
    startLng: 74.8875,
    startLocation: 'Bajpe Airport Road, Mangaluru, 574142, Dakshina Kannada, Karnataka',
    lastGpsLat: 12.8449,
    lastGpsLng: 74.8498,
    lastGpsAccuracy: 10,
    lastGpsSpeedKmh: 52,
    lastGpsLocationName: 'Kodialbail, Lalbagh, Mangaluru, 575003, Dakshina Kannada, Karnataka',
    customerPhoneReleased: true,
    customer: { fullName: 'Vikram Shetty', phone: '9900112233', user: { phone: '9900112233' } },
    vehicle: { name: 'Innova Crysta' },
    assignedDriver: { id: 'd_ramesh', fullName: 'Ramesh Poojary', user: { phone: '9741098765' } },
    createdAt: new Date(Date.now() - 10800000).toISOString(),
  },
  {
    id: 'b_kc10492',
    humanReadableRef: 'KC10492',
    tripType: 'OUTSTATION',
    pickupAddress: 'Mangaluru, Karnataka',
    dropAddress: 'Dharmasthala Temple, Karnataka',
    scheduledAt: new Date(Date.now() - 86400000).toISOString(),
    distanceKm: 75,
    estimatedFare: 2800,
    advanceAmount: 700,
    advancePaymentStatus: 'PAID',
    balanceAmount: 2100,
    balancePaymentStatus: 'PAID',
    tollAmount: 50,
    status: 'TRIP_COMPLETED',
    tripStartedAt: new Date(Date.now() - 90000000).toISOString(),
    tripCompletedAt: new Date(Date.now() - 80000000).toISOString(),
    startingOdometer: 98120,
    startingOdometerImagePath: '/uploads/sample_start_odo.jpg',
    finalOdometer: 98198,
    finalOdometerImagePath: '/uploads/sample_end_odo.jpg',
    actualDistanceKm: 78,
    customerPhoneReleased: true,
    customer: { fullName: 'Ananya Hegde', phone: '9141099887', user: { phone: '9141099887' } },
    vehicle: { name: 'Swift Dzire (Sedan)' },
    assignedDriver: { id: 'd_suresh', fullName: 'Suresh Naik', user: { phone: '9481088776' } },
    createdAt: new Date(Date.now() - 95000000).toISOString(),
  },
  {
    id: 'b_kc44109',
    humanReadableRef: 'KC44109',
    tripType: 'ONEWAY',
    pickupAddress: 'Bangalore, Karnataka',
    dropAddress: 'Hassan, Karnataka',
    scheduledAt: new Date(Date.now() - 172800000).toISOString(),
    distanceKm: 180,
    estimatedFare: 3500,
    advanceAmount: 875,
    advancePaymentStatus: 'PENDING',
    balanceAmount: 2625,
    balancePaymentStatus: 'PENDING',
    tollAmount: 0,
    status: 'CANCELLED',
    cancellationReason: 'Customer requested cancellation due to travel plan change.',
    customerPhoneReleased: false,
    customer: { fullName: 'Karthik Bhat', phone: '9845099001', user: { phone: '9845099001' } },
    vehicle: { name: 'Sedan (Standard)' },
    createdAt: new Date(Date.now() - 180000000).toISOString(),
  },
];

if (!globalForBookingStore.bookingRegistry || globalForBookingStore.bookingRegistry.length === 0) {
  globalForBookingStore.bookingRegistry = [...initialSampleBookings];
}
if (!globalForBookingStore.tripTrackingLogs) {
  globalForBookingStore.tripTrackingLogs = new Map();
}
if (!globalForBookingStore.tripAuditLogs) {
  globalForBookingStore.tripAuditLogs = new Map();
}

const bookingRegistry = globalForBookingStore.bookingRegistry;
const tripTrackingLogs = globalForBookingStore.tripTrackingLogs;
const tripAuditLogs = globalForBookingStore.tripAuditLogs;

export function addStoredBooking(booking: StoredBooking) {
  const exists = bookingRegistry.some((b) => b.id === booking.id || b.humanReadableRef === booking.humanReadableRef);
  if (!exists) {
    bookingRegistry.unshift(booking);
  }
}

export function getAllStoredBookings(): StoredBooking[] {
  return bookingRegistry;
}

export function getStoredBookingById(idOrRef: string): StoredBooking | null {
  return bookingRegistry.find((b) => b.id === idOrRef || b.humanReadableRef === idOrRef) || null;
}

export function updateStoredBookingStatus(bookingIdOrRef: string, status: string, cancellationReason?: string): boolean {
  const booking = bookingRegistry.find((b) => b.id === bookingIdOrRef || b.humanReadableRef === bookingIdOrRef);
  if (booking) {
    booking.status = status;
    if (cancellationReason) {
      booking.cancellationReason = cancellationReason;
    }
    logTripAudit(booking.id, `STATUS_CHANGED_${status}`, 'SYSTEM', { status, cancellationReason });
    return true;
  }
  return false;
}

export function updateStoredBookingDriver(bookingIdOrRef: string, driver: { id: string; fullName: string; user?: { phone: string } }): boolean {
  const booking = bookingRegistry.find((b) => b.id === bookingIdOrRef || b.humanReadableRef === bookingIdOrRef);
  if (booking) {
    booking.assignedDriver = driver;
    booking.status = 'DRIVER_ACCEPTED';
    logTripAudit(booking.id, 'DRIVER_ACCEPTED_TRIP', driver.fullName, { driver });
    return true;
  }
  return false;
}

export function updateStoredBookingContactRelease(bookingIdOrRef: string, release: boolean): boolean {
  const booking = bookingRegistry.find((b) => b.id === bookingIdOrRef || b.humanReadableRef === bookingIdOrRef);
  if (booking) {
    booking.customerPhoneReleased = release;
    logTripAudit(booking.id, 'CONTACT_RELEASE_TOGGLED', 'ADMIN', { release });
    return true;
  }
  return false;
}

export function updateStoredBookingPartial(bookingIdOrRef: string, partial: Partial<StoredBooking>): StoredBooking | null {
  const booking = bookingRegistry.find((b) => b.id === bookingIdOrRef || b.humanReadableRef === bookingIdOrRef);
  if (booking) {
    Object.assign(booking, partial);
    return booking;
  }
  return null;
}

export function updateConfirmedPickupLocation(bookingIdOrRef: string, lat: number, lng: number): boolean {
  const booking = bookingRegistry.find((b) => b.id === bookingIdOrRef || b.humanReadableRef === bookingIdOrRef);
  if (booking) {
    booking.confirmedPickupLat = lat;
    booking.confirmedPickupLng = lng;
    booking.confirmedPickupAt = new Date().toISOString();
    booking.trackingStatus = 'CUSTOMER_LOCATION_CONFIRMED';
    logTripAudit(booking.id, 'CUSTOMER_LOCATION_CONFIRMED', 'DRIVER', { lat, lng });
    return true;
  }
  return false;
}

function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getKnownLocationName(lat: number, lng: number): string {
  if (lat >= 12.75 && lat <= 13.05 && lng >= 74.70 && lng <= 75.05) {
    if (Math.abs(lat - 12.8449) < 0.02 && Math.abs(lng - 74.8498) < 0.02) {
      return 'Kodialbail, Lalbagh, Mangaluru, 575003, Dakshina Kannada, Karnataka';
    }
    return 'Hampankatta, Central Market, Mangaluru, 575001, Dakshina Kannada, Karnataka';
  }
  if (lat >= 12.80 && lat <= 13.20 && lng >= 77.40 && lng <= 77.80) {
    return 'MG Road, Shanthala Nagar, Bangalore Central, 560001, Karnataka';
  }
  if (lat >= 12.20 && lat <= 12.45 && lng >= 76.50 && lng <= 76.80) {
    return 'Agrahara, Chamrajpura, Mysore Palace, 570004, Mysore, Karnataka';
  }
  return `Location (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`;
}

export function recordTripGpsPoint(bookingIdOrRef: string, lat: number, lng: number, speedKmh?: number, accuracy?: number, locationName?: string) {
  const booking = bookingRegistry.find((b) => b.id === bookingIdOrRef || b.humanReadableRef === bookingIdOrRef);
  const now = new Date().toISOString();
  const bId = booking?.id || bookingIdOrRef;
  const list = tripTrackingLogs.get(bId) || [];

  let effectiveSpeedKmh = speedKmh && speedKmh > 0 ? Math.round(speedKmh) : 0;
  if (effectiveSpeedKmh === 0 && list.length > 0) {
    const lastPoint = list[list.length - 1];
    const prevTimeMs = new Date(lastPoint.timestamp).getTime();
    const currTimeMs = new Date(now).getTime();
    const timeDiffHours = (currTimeMs - prevTimeMs) / (1000 * 3600);
    if (timeDiffHours > 0 && timeDiffHours < 0.1) {
      const distKm = calculateHaversineKm(lastPoint.latitude, lastPoint.longitude, lat, lng);
      const calcSpeed = Math.round(distKm / timeDiffHours);
      if (calcSpeed >= 3 && calcSpeed <= 160) {
        effectiveSpeedKmh = calcSpeed;
      }
    }
  }

  const resolvedLocName = locationName || (booking?.lastGpsLocationName) || getKnownLocationName(lat, lng);

  if (booking) {
    booking.lastGpsLat = lat;
    booking.lastGpsLng = lng;
    booking.lastGpsAccuracy = accuracy || 8;
    booking.lastGpsSpeedKmh = effectiveSpeedKmh;
    booking.lastGpsLocationName = resolvedLocName;
    booking.lastGpsUpdatedAt = now;
  }

  list.push({ latitude: lat, longitude: lng, timestamp: now, speedKmh: effectiveSpeedKmh, accuracy: accuracy || 8 });
  if (list.length > 500) list.shift();
  tripTrackingLogs.set(bId, list);
}

export function getTripGpsPoints(bookingIdOrRef: string) {
  const booking = bookingRegistry.find((b) => b.id === bookingIdOrRef || b.humanReadableRef === bookingIdOrRef);
  const bId = booking?.id || bookingIdOrRef;
  return tripTrackingLogs.get(bId) || [];
}

export function logTripAudit(bookingIdOrRef: string, eventType: string, actor: string, metadata?: any) {
  const booking = bookingRegistry.find((b) => b.id === bookingIdOrRef || b.humanReadableRef === bookingIdOrRef);
  const bId = booking?.id || bookingIdOrRef;
  const list = tripAuditLogs.get(bId) || [];
  list.push({
    eventType,
    actor,
    timestamp: new Date().toISOString(),
    metadata,
  });
  tripAuditLogs.set(bId, list);
}

export function getTripAuditLogs(bookingIdOrRef: string) {
  const booking = bookingRegistry.find((b) => b.id === bookingIdOrRef || b.humanReadableRef === bookingIdOrRef);
  const bId = booking?.id || bookingIdOrRef;
  return tripAuditLogs.get(bId) || [];
}


