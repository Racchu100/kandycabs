export interface GeoPoint {
  lat: number;
  lng: number;
  address?: string;
}

export interface CalculatedDistanceResult {
  distanceKm: number;
  durationMinutes: number;
  source: 'google_maps' | 'server_calculated';
}

/**
 * Haversine formula to compute great-circle distance between two points,
 * multiplied by road tortuosity factor (1.25x) for real driving distance in coastal Karnataka.
 */
export function calculateHaversineRoadDistance(point1: GeoPoint, point2: GeoPoint): number {
  const R = 6371; // Earth radius in km
  const dLat = ((point2.lat - point1.lat) * Math.PI) / 180;
  const dLng = ((point2.lng - point1.lng) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((point1.lat * Math.PI) / 180) *
      Math.cos((point2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightLineKm = R * c;

  // Apply 1.25 road curvature factor
  const roadKm = Math.ceil(straightLineKm * 1.25);
  return Math.max(roadKm, 10); // Minimum 10 km
}

/**
 * Server-side distance calculation & validation.
 * NEVER trusts client-supplied distance.
 */
export async function calculateAndValidateDistance(
  pickup: GeoPoint,
  drop: GeoPoint,
  clientDistanceKm?: number
): Promise<CalculatedDistanceResult> {
  // Compute true server distance
  const calculatedKm = calculateHaversineRoadDistance(pickup, drop);
  const durationMinutes = Math.round((calculatedKm / 45) * 60); // Average 45 km/h driving speed

  return {
    distanceKm: calculatedKm,
    durationMinutes,
    source: 'server_calculated',
  };
}
