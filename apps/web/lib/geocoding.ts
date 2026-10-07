/**
 * High-Performance Server-Side Reverse Geocoding Cache & Request Coalescing
 * Normalized coordinate grid (~11m precision), 2-hour TTL, in-flight promise deduplication.
 */

interface GeocodeCacheEntry {
  address: string;
  expiresAt: number;
}

const MAX_GEOCODE_CACHE_SIZE = 5000;
const GEOCODE_CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 Hours

// In-Memory LRU Cache
const geocodeMemoryCache = new Map<string, GeocodeCacheEntry>();

// In-Flight Promise Map for Concurrent Request Coalescing (Prevents identical parallel external HTTP calls)
const inFlightGeocodes = new Map<string, Promise<string>>();

export function getGeocodeCacheKey(lat: number, lng: number): string {
  return `rev_geo:${lat.toFixed(4)},${lng.toFixed(4)}`;
}

function getFromCache(key: string): string | null {
  const entry = geocodeMemoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    geocodeMemoryCache.delete(key);
    return null;
  }
  // Touch LRU
  geocodeMemoryCache.delete(key);
  geocodeMemoryCache.set(key, entry);
  return entry.address;
}

function saveToCache(key: string, address: string): void {
  if (geocodeMemoryCache.size >= MAX_GEOCODE_CACHE_SIZE) {
    const oldestKey = geocodeMemoryCache.keys().next().value;
    if (oldestKey) geocodeMemoryCache.delete(oldestKey);
  }
  geocodeMemoryCache.set(key, {
    address,
    expiresAt: Date.now() + GEOCODE_CACHE_TTL_MS,
  });
}

/**
 * Reverse geocodes coordinates into a human-readable street address.
 * 1. Checks in-memory normalized cache (< 0.1ms)
 * 2. Coalesces concurrent in-flight requests for the same grid coordinate
 * 3. Calls OpenStreetMap Nominatim with 3.5s timeout
 * 4. Falls back to formatted coordinates on network/service failure
 */
export async function reverseGeocodeCoordinates(
  lat: number,
  lng: number
): Promise<{ address: string; cached: boolean }> {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    return { address: 'Unknown Location', cached: false };
  }

  const cacheKey = getGeocodeCacheKey(lat, lng);

  // 1. Fast Cache Lookup
  const cachedAddress = getFromCache(cacheKey);
  if (cachedAddress) {
    return { address: cachedAddress, cached: true };
  }

  // 2. In-Flight Coalescing: If an identical request is already active, await it
  if (inFlightGeocodes.has(cacheKey)) {
    const coalescedResult = await inFlightGeocodes.get(cacheKey)!;
    return { address: coalescedResult, cached: true };
  }

  // 3. Execute external fetch with coalesced promise
  const fetchPromise = (async (): Promise<string> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'KandyCabs/1.0',
          },
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};

        const building =
          addr.building ||
          addr.amenity ||
          addr.shop ||
          addr.tourism ||
          addr.office ||
          '';
        const road = addr.road || addr.street || addr.pedestrian || '';
        const locality =
          addr.suburb ||
          addr.neighbourhood ||
          addr.residential ||
          addr.quarter ||
          '';
        const city =
          addr.city ||
          addr.town ||
          addr.village ||
          addr.state_district ||
          'Mangaluru';

        const parts: string[] = [];
        if (building) parts.push(building);
        if (road && road !== building) parts.push(road);
        if (locality && !parts.includes(locality)) parts.push(locality);
        if (city && !parts.includes(city)) parts.push(city);

        if (parts.length === 0 && data.display_name) {
          parts.push(data.display_name.split(',').slice(0, 3).join(', '));
        }

        const formatted =
          parts.length > 0
            ? parts.join(', ')
            : `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;

        saveToCache(cacheKey, formatted);
        return formatted;
      }
    } catch (_) {
      // Nominatim timeout, network error, or rate limit
    } finally {
      clearTimeout(timeout);
    }

    // Fail-safe graceful fallback
    const fallback = `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
    saveToCache(cacheKey, fallback);
    return fallback;
  })();

  inFlightGeocodes.set(cacheKey, fetchPromise);

  try {
    const address = await fetchPromise;
    return { address, cached: false };
  } finally {
    inFlightGeocodes.delete(cacheKey);
  }
}
