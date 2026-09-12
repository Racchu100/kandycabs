import { calculateHaversineDistance, SelectedLocation } from './locationProvider';

export interface GeocodedLocation {
  address: string;
  lat: number;
  lng: number;
}

export interface RouteEstimate {
  distanceKm: number;
  durationMinutes: number;
  origin: GeocodedLocation;
  destination: GeocodedLocation;
  legBreakdown?: { from: string; to: string; km: number }[];
}

/**
 * Derives single leg route distance (km) and estimated duration (mins)
 * using selected location coordinates (lat, lng), Google Directions API, or Haversine fallback.
 */
export async function getRouteEstimate(
  originInput: string | SelectedLocation,
  destInput: string | SelectedLocation
): Promise<RouteEstimate> {
  const originName = typeof originInput === 'string' ? originInput : originInput.placeName || originInput.address;
  const destName = typeof destInput === 'string' ? destInput : destInput.placeName || destInput.address;

  const originLat = typeof originInput === 'object' ? originInput.latitude : 0;
  const originLng = typeof originInput === 'object' ? originInput.longitude : 0;
  const destLat = typeof destInput === 'object' ? destInput.latitude : 0;
  const destLng = typeof destInput === 'object' ? destInput.longitude : 0;

  // 1. If exact latitude & longitude coordinates exist for both locations, use Haversine coordinate math
  if (originLat && originLng && destLat && destLng) {
    const distanceKm = calculateHaversineDistance(originLat, originLng, destLat, destLng);
    // Estimated average speed in South India: ~50 km/h (1.2 mins per km)
    const durationMinutes = Math.ceil(distanceKm * 1.2);

    return {
      distanceKm,
      durationMinutes,
      origin: { address: originName, lat: originLat, lng: originLng },
      destination: { address: destName, lat: destLat, lng: destLng },
    };
  }

  // 2. Google Directions API Call (if API key is present)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (apiKey && apiKey !== 'AIzaSyDemoKeyForGoogleMapsPlatform') {
    try {
      const originParam = originLat && originLng ? `${originLat},${originLng}` : encodeURIComponent(originName);
      const destParam = destLat && destLng ? `${destLat},${destLng}` : encodeURIComponent(destName);
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originParam}&destination=${destParam}&key=${apiKey}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.status === 'OK' && data.routes?.[0]?.legs?.[0]) {
        const leg = data.routes[0].legs[0];
        return {
          distanceKm: Math.ceil(leg.distance.value / 1000),
          durationMinutes: Math.ceil(leg.duration.value / 60),
          origin: {
            address: leg.start_address,
            lat: leg.start_location.lat,
            lng: leg.start_location.lng,
          },
          destination: {
            address: leg.end_address,
            lat: leg.end_location.lat,
            lng: leg.end_location.lng,
          },
        };
      }
    } catch (err) {
      console.warn('Google Directions API failed, using fallback:', err);
    }
  }

  // 3. Fallback City Matrix Lookup
  const cityLeg = getCityDistance(originName, destName);

  return {
    distanceKm: cityLeg.distanceKm,
    durationMinutes: cityLeg.durationMinutes,
    origin: { address: originName, lat: originLat || 12.9716, lng: originLng || 77.5946 },
    destination: { address: destName, lat: destLat || 12.2958, lng: destLng || 76.6394 },
  };
}

export function getCityDistance(from: string, to: string): { distanceKm: number; durationMinutes: number } {
  const f = from.toLowerCase();
  const t = to.toLowerCase();
  
  if (!f || !t || f === t) return { distanceKm: 0, durationMinutes: 0 };
  
  const getCity = (s: string) => {
    if (s.includes('mangalore') || s.includes('mangaluru')) return 'mangalore';
    if (s.includes('udupi')) return 'udupi';
    if (s.includes('coorg') || s.includes('madikeri')) return 'coorg';
    if (s.includes('bangalore') || s.includes('bengaluru')) return 'bangalore';
    if (s.includes('mysore') || s.includes('mysuru')) return 'mysore';
    if (s.includes('ooty')) return 'ooty';
    if (s.includes('wayanad')) return 'wayanad';
    if (s.includes('goa')) return 'goa';
    if (s.includes('airport')) return 'airport';
    return 'default';
  };

  const c1 = getCity(f);
  const c2 = getCity(t);

  if (c1 === c2 && c1 !== 'default') {
    return { distanceKm: 25, durationMinutes: 45 };
  }

  const key = [c1, c2].sort().join('-');

  const matrix: Record<string, { distanceKm: number; durationMinutes: number }> = {
    'coorg-mangalore': { distanceKm: 140, durationMinutes: 210 },
    'mangalore-udupi': { distanceKm: 60, durationMinutes: 90 },
    'coorg-udupi': { distanceKm: 195, durationMinutes: 270 },
    'bangalore-mangalore': { distanceKm: 350, durationMinutes: 420 },
    'bangalore-coorg': { distanceKm: 265, durationMinutes: 330 },
    'bangalore-mysore': { distanceKm: 145, durationMinutes: 180 },
    'bangalore-goa': { distanceKm: 560, durationMinutes: 660 },
    'bangalore-ooty': { distanceKm: 275, durationMinutes: 360 },
    'mangalore-mysore': { distanceKm: 250, durationMinutes: 300 },
    'goa-mangalore': { distanceKm: 360, durationMinutes: 450 },
    'airport-bangalore': { distanceKm: 42, durationMinutes: 65 },
    'airport-mangalore': { distanceKm: 15, durationMinutes: 30 },
  };

  if (matrix[key]) return matrix[key];

  return { distanceKm: 120, durationMinutes: 150 };
}

/**
 * Derives multi-stop cumulative route distance for Round Trips with intermediate stops.
 */
export async function getMultiStopRouteEstimate(
  pickupInput: string | SelectedLocation,
  dropInput: string | SelectedLocation,
  stops: (string | SelectedLocation)[] = [],
  isRoundTrip: boolean = true
): Promise<RouteEstimate> {
  const waypoints = [pickupInput, ...stops, dropInput];
  
  if (isRoundTrip) {
    waypoints.push(pickupInput); // Return to origin
  }

  let totalDistanceKm = 0;
  let totalDurationMinutes = 0;
  const legBreakdown: { from: string; to: string; km: number }[] = [];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const from = waypoints[i];
    const to = waypoints[i + 1];
    const fromName = typeof from === 'string' ? from : from.placeName || from.address;
    const toName = typeof to === 'string' ? to : to.placeName || to.address;

    const legEstimate = await getRouteEstimate(from, to);
    totalDistanceKm += legEstimate.distanceKm;
    totalDurationMinutes += legEstimate.durationMinutes;
    legBreakdown.push({
      from: fromName,
      to: toName,
      km: legEstimate.distanceKm,
    });
  }

  const originName = typeof pickupInput === 'string' ? pickupInput : pickupInput.placeName || pickupInput.address;
  const destName = typeof dropInput === 'string' ? dropInput : dropInput.placeName || dropInput.address;

  return {
    distanceKm: totalDistanceKm,
    durationMinutes: totalDurationMinutes,
    origin: {
      address: originName,
      lat: typeof pickupInput === 'object' ? pickupInput.latitude : 12.9716,
      lng: typeof pickupInput === 'object' ? pickupInput.longitude : 77.5946,
    },
    destination: {
      address: destName,
      lat: typeof dropInput === 'object' ? dropInput.latitude : 12.2958,
      lng: typeof dropInput === 'object' ? dropInput.longitude : 76.6394,
    },
    legBreakdown,
  };
}
