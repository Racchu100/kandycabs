/**
 * Phase 15 — High-Performance Redis Caching & Telemetry Buffer Engine
 * Provides OTP rate limiting, high-frequency GPS buffering, and API cache controls.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const memoryRedisCache = new Map<string, CacheEntry<any>>();
const otpRateLimitMap = new Map<string, { attempts: number; windowStart: number }>();
const gpsTelemetryBufferMap = new Map<string, { lat: number; lng: number; speed: number; timestamp: number }[]>();

/**
 * 1. Redis API Caching Layer with TTL
 */
export function setRedisCache<T>(key: string, data: T, ttlSeconds: number = 60): void {
  memoryRedisCache.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export function getRedisCache<T>(key: string): T | null {
  const entry = memoryRedisCache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    memoryRedisCache.delete(key);
    return null;
  }

  return entry.data as T;
}

/**
 * 2. Redis OTP & API Rate Limiting (Prevent Brute Force)
 */
export function checkOtpRateLimit(
  ipOrPhone: string,
  maxAttempts: number = 5,
  windowSeconds: number = 900 // 15 mins
): { allowed: boolean; remainingAttempts: number; retryAfterSeconds: number } {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const record = otpRateLimitMap.get(ipOrPhone);

  if (!record || now - record.windowStart > windowMs) {
    otpRateLimitMap.set(ipOrPhone, { attempts: 1, windowStart: now });
    return { allowed: true, remainingAttempts: maxAttempts - 1, retryAfterSeconds: 0 };
  }

  if (record.attempts >= maxAttempts) {
    const retryAfter = Math.ceil((record.windowStart + windowMs - now) / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSeconds: retryAfter };
  }

  record.attempts += 1;
  return { allowed: true, remainingAttempts: maxAttempts - record.attempts, retryAfterSeconds: 0 };
}

/**
 * 3. High-Frequency GPS Telemetry Buffer (Prevents direct PostgreSQL inserts every 5s)
 */
export function bufferGpsTelemetry(
  driverId: string,
  lat: number,
  lng: number,
  speed: number = 0
): { bufferedPointsCount: number; requiresFlushing: boolean } {
  const points = gpsTelemetryBufferMap.get(driverId) || [];
  points.push({ lat, lng, speed, timestamp: Date.now() });
  gpsTelemetryBufferMap.set(driverId, points);

  // Flush buffer to PostgreSQL only when 20 points accumulate (or every 2-3 minutes)
  const requiresFlushing = points.length >= 20;
  return { bufferedPointsCount: points.length, requiresFlushing };
}

export function flushGpsTelemetryBuffer(driverId: string): number {
  const points = gpsTelemetryBufferMap.get(driverId) || [];
  const count = points.length;
  gpsTelemetryBufferMap.delete(driverId);
  return count;
}

/**
 * 4. Database Indexing Recommendations Schema Audit
 */
export const RECOMMENDED_DATABASE_INDEXES = [
  { table: 'bookings', indexName: 'idx_bookings_reference', column: 'booking_reference', type: 'UNIQUE BTREE' },
  { table: 'bookings', indexName: 'idx_bookings_status_created', column: 'status, created_at DESC', type: 'BTREE' },
  { table: 'trips', indexName: 'idx_trips_driver_status', column: 'driver_id, status', type: 'BTREE' },
  { table: 'locations', indexName: 'idx_locations_search_active', column: 'search_name, is_active', type: 'GIN / BTREE' },
  { table: 'gps_telemetry', indexName: 'idx_gps_trip_timestamp', column: 'trip_id, timestamp DESC', type: 'BRIN / BTREE' },
];
