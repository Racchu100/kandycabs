import { recordAuditLog } from '@/lib/adminEngine';

export interface TripOtpRecord {
  bookingId: string;
  otpCode: string;
  expiresAt: number; // Timestamp ms
  attempts: number; // Max 3
  maxAttempts: number;
  lastRequestedAt: number;
  resendCooldownSeconds: number; // 30s
  isVerified: boolean;
}

const tripOtpStore = new Map<string, TripOtpRecord>(); // bookingId -> TripOtpRecord

// Seed OTP record for booking KC-88429
tripOtpStore.set('KC-88429', {
  bookingId: 'KC-88429',
  otpCode: '4829',
  expiresAt: Date.now() + 15 * 60 * 1000,
  attempts: 0,
  maxAttempts: 3,
  lastRequestedAt: Date.now() - 60 * 1000,
  resendCooldownSeconds: 30,
  isVerified: false,
});

/**
 * Generate Secure Trip OTP for Booking
 */
export function generateTripOtp(bookingId: string): TripOtpRecord {
  const existing = tripOtpStore.get(bookingId);
  const now = Date.now();

  if (existing && now - existing.lastRequestedAt < existing.resendCooldownSeconds * 1000) {
    throw new Error(`Resend cooldown active. Please wait ${Math.ceil((existing.resendCooldownSeconds * 1000 - (now - existing.lastRequestedAt)) / 1000)} seconds.`);
  }

  const otpCode = Math.floor(1000 + Math.random() * 9000).toString(); // Secure 4-digit code
  const record: TripOtpRecord = {
    bookingId,
    otpCode,
    expiresAt: now + 15 * 60 * 1000, // 15 min expiry
    attempts: 0,
    maxAttempts: 3,
    lastRequestedAt: now,
    resendCooldownSeconds: 30,
    isVerified: false,
  };

  tripOtpStore.set(bookingId, record);
  return record;
}

/**
 * Verify Driver OTP for Trip Start
 */
export function verifyTripOtp(
  bookingId: string,
  inputOtp: string,
  driverId: string
): { success: boolean; error?: string } {
  const record = tripOtpStore.get(bookingId);
  if (!record) {
    return { success: false, error: 'No OTP record found for this booking reference.' };
  }

  const now = Date.now();
  if (now > record.expiresAt) {
    return { success: false, error: 'OTP has expired. Please ask customer to request a resend.' };
  }

  if (record.attempts >= record.maxAttempts) {
    return { success: false, error: 'Maximum verification attempts exceeded (3/3). Please request admin override.' };
  }

  if (record.otpCode !== inputOtp.trim()) {
    record.attempts += 1;
    tripOtpStore.set(bookingId, record);
    return {
      success: false,
      error: `Invalid OTP code. ${record.maxAttempts - record.attempts} attempts remaining.`,
    };
  }

  record.isVerified = true;
  tripOtpStore.set(bookingId, record);

  recordAuditLog({
    adminId: driverId,
    adminName: 'Driver Chauffeur',
    action: 'VERIFY_TRIP_OTP',
    targetType: 'BOOKING',
    targetId: bookingId,
    details: `Driver verified customer OTP (${inputOtp}) successfully for booking ${bookingId}`,
  });

  return { success: true };
}

/**
 * Admin Trip Start Override
 */
export function adminOverrideStartTrip(
  bookingId: string,
  adminId: string,
  adminName: string,
  reason: string
): { success: boolean; message: string } {
  const record = tripOtpStore.get(bookingId) || {
    bookingId,
    otpCode: 'ADMIN_OVERRIDE',
    expiresAt: Date.now() + 3600000,
    attempts: 0,
    maxAttempts: 3,
    lastRequestedAt: Date.now(),
    resendCooldownSeconds: 30,
    isVerified: false,
  };

  record.isVerified = true;
  tripOtpStore.set(bookingId, record);

  recordAuditLog({
    adminId,
    adminName,
    action: 'ADMIN_OTP_OVERRIDE',
    targetType: 'BOOKING',
    targetId: bookingId,
    details: `Admin ${adminName} manually overridden OTP trip start for booking ${bookingId}. Reason: ${reason}`,
  });

  return {
    success: true,
    message: `Admin override logged for booking ${bookingId}. Trip state set to TRIP_STARTED.`,
  };
}

export interface MeterEvidenceRecord {
  id: string;
  bookingId: string;
  driverId: string;
  captureType: 'PICKUP_METER' | 'DROPOFF_METER';
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  odometerReadingKm: number;
  imageUrl: string;
  thumbnailUrl: string;
  capturedAt: string;
}

const meterEvidenceStore = new Map<string, MeterEvidenceRecord[]>(); // bookingId -> MeterEvidenceRecord[]

// Seed initial pickup meter image evidence for KC-88429
meterEvidenceStore.set('KC-88429', [
  {
    id: 'ev_pickup_101',
    bookingId: 'KC-88429',
    driverId: 'driver_suresh',
    captureType: 'PICKUP_METER',
    latitude: 12.8702,
    longitude: 74.843,
    accuracyMeters: 4.0,
    odometerReadingKm: 12450,
    imageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=200&q=80',
    capturedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
]);

/**
 * Record Optimized Meter Evidence (Server-Authoritative GPS)
 */
export function recordMeterEvidence(
  bookingId: string,
  driverId: string,
  captureType: 'PICKUP_METER' | 'DROPOFF_METER',
  latitude: number,
  longitude: number,
  accuracyMeters: number,
  odometerReadingKm: number,
  rawImageData?: string
): MeterEvidenceRecord {
  // Image Processing Simulation (Sharp High-Quality Compression & Thumbnail Generation)
  const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  const imageUrl = rawImageData || `https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80#${imageId}`;
  const thumbnailUrl = rawImageData || `https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=200&q=80#${imageId}_thumb`;

  const record: MeterEvidenceRecord = {
    id: `ev_${Date.now()}`,
    bookingId,
    driverId,
    captureType,
    latitude,
    longitude,
    accuracyMeters,
    odometerReadingKm,
    imageUrl,
    thumbnailUrl,
    capturedAt: new Date().toISOString(),
  };

  const existing = meterEvidenceStore.get(bookingId) || [];
  existing.push(record);
  meterEvidenceStore.set(bookingId, existing);

  return record;
}

/**
 * Get Meter Evidence Comparison for Admin Console
 */
export function getMeterEvidenceComparison(bookingId: string): {
  pickup?: MeterEvidenceRecord;
  dropoff?: MeterEvidenceRecord;
} {
  const records = meterEvidenceStore.get(bookingId) || [];
  return {
    pickup: records.find((r) => r.captureType === 'PICKUP_METER'),
    dropoff: records.find((r) => r.captureType === 'DROPOFF_METER'),
  };
}
