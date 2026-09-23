// In-memory geocode cache to prevent redundant lookups
const geocodeCache = new Map<string, string>();

export async function reverseGeocodeLocation(lat: number, lng: number): Promise<string> {
  if (!lat || !lng || isNaN(lat) || isNaN(lng)) return 'Unknown Location';
  
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (geocodeCache.has(key)) {
    return geocodeCache.get(key)!;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'KandyCabs-Admin/1.0',
          'Accept-Language': 'en',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      
      const building = addr.building || addr.amenity || addr.shop || addr.tourism || addr.office || '';
      const road = addr.road || addr.street || '';
      const locality = addr.suburb || addr.neighbourhood || addr.residential || addr.commercial || '';
      const city = addr.city || addr.town || addr.village || addr.county || '';

      const parts: string[] = [];
      if (building) parts.push(building);
      if (road && road !== building) parts.push(road);
      if (locality && !parts.includes(locality)) parts.push(locality);
      if (city && !parts.includes(city)) parts.push(city);
      if (parts.length === 0 && data.display_name) {
        parts.push(data.display_name.split(',').slice(0, 3).join(', '));
      }

      const formatted = parts.length > 0 ? parts.join(', ') : `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
      geocodeCache.set(key, formatted);
      return formatted;
    }
  } catch (_) {
    // Fallback on timeout or network error
  }

  const fallback = `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
  geocodeCache.set(key, fallback);
  return fallback;
}
