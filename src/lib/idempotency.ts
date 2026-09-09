const idempotencyStore = new Map<string, { booking: any; createdAt: number }>();

// Clean up keys older than 1 hour periodically
const TTL_MS = 60 * 60 * 1000;

export function getExistingBookingByIdempotencyKey(key: string): any | null {
  const record = idempotencyStore.get(key);
  if (!record) return null;
  if (Date.now() - record.createdAt > TTL_MS) {
    idempotencyStore.delete(key);
    return null;
  }
  return record.booking;
}

export function saveBookingIdempotencyKey(key: string, booking: any): void {
  idempotencyStore.set(key, {
    booking,
    createdAt: Date.now(),
  });
}
