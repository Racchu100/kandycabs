import * as Location from 'expo-location';
import { Linking, Platform } from 'react-native';

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
}

export interface GeocodedAddress {
  formattedAddress: string;
  shortAddress: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
}

export type LocationPermissionResult =
  | { status: 'granted' }
  | { status: 'denied'; canAskAgain: boolean }
  | { status: 'services_disabled' }
  | { status: 'error'; message: string };

/**
 * Requests native foreground location permission from Android or iOS.
 */
export async function requestLocationPermission(): Promise<LocationPermissionResult> {
  try {
    // 1. Verify if device location services (GPS hardware switch) is enabled
    const isServiceEnabled = await Location.hasServicesEnabledAsync().catch(() => true);
    if (!isServiceEnabled) {
      return { status: 'services_disabled' };
    }

    // 2. Check current foreground permission status
    const currentStatus = await Location.getForegroundPermissionsAsync();
    if (currentStatus.status === Location.PermissionStatus.GRANTED) {
      return { status: 'granted' };
    }

    // 3. Request native foreground permission
    const requestRes = await Location.requestForegroundPermissionsAsync();
    if (requestRes.status === Location.PermissionStatus.GRANTED) {
      return { status: 'granted' };
    }

    return {
      status: 'denied',
      canAskAgain: requestRes.canAskAgain ?? true,
    };
  } catch (err: any) {
    console.log('[locationService] Permission error:', err);
    return {
      status: 'error',
      message: err.message || 'Unable to request location permission',
    };
  }
}

/**
 * Opens device app settings so the user can re-enable permission if blocked.
 */
export async function openLocationAppSettings(): Promise<void> {
  try {
    if (Platform.OS === 'ios') {
      await Linking.openURL('app-settings:');
    } else {
      await Linking.openSettings();
    }
  } catch (err) {
    console.warn('[locationService] Failed to open app settings:', err);
  }
}

/**
 * Obtains the device's current high-accuracy GPS coordinates.
 */
export async function getCurrentCoordinates(): Promise<Coordinates> {
  try {
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
      distanceInterval: 10,
    });

    return {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy: loc.coords.accuracy,
      timestamp: loc.timestamp,
    };
  } catch (highAccErr) {
    console.warn('[locationService] High accuracy timeout/error, falling back to Balanced:', highAccErr);
    // Fallback to balanced accuracy
    const fallbackLoc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: fallbackLoc.coords.latitude,
      longitude: fallbackLoc.coords.longitude,
      accuracy: fallbackLoc.coords.accuracy,
      timestamp: fallbackLoc.timestamp,
    };
  }
}

/**
 * Reverse-geocodes latitude and longitude into a clean, human-readable address.
 */
export async function reverseGeocodeCoordinates(
  latitude: number,
  longitude: number
): Promise<GeocodedAddress> {
  // Strategy 1: Expo native reverse geocoding
  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (results && results.length > 0) {
      const r = results[0];
      const street = r.street || r.name || '';
      const district = r.district || r.subregion || '';
      const city = r.city || district || 'Mangaluru';
      const region = r.region || 'Karnataka';
      const postalCode = r.postalCode || '';

      const parts = [street, district, city, region, postalCode]
        .map(p => p?.trim())
        .filter((p, idx, arr) => p && arr.indexOf(p) === idx);

      const formatted = parts.join(', ');
      const short = street ? `${street}, ${city}` : `${city}, ${region}`;

      if (formatted.length > 3) {
        return {
          formattedAddress: formatted,
          shortAddress: short,
          city,
          state: region,
          pincode: postalCode,
          latitude,
          longitude,
        };
      }
    }
  } catch (nativeErr) {
    console.log('[locationService] Expo native reverse geocode fallback:', nativeErr);
  }

  // Strategy 2: OpenStreetMap Nominatim API
  try {
    const nomRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'KandyCabsCustomerApp/1.0 (operations@kandycabs.com)',
          'Accept-Language': 'en',
        },
      }
    );
    if (nomRes.ok) {
      const data = await nomRes.json();
      if (data?.address) {
        const a = data.address;
        const locality = a.road || a.pedestrian || a.amenity || a.building || a.house_number || '';
        const area = a.suburb || a.neighbourhood || a.quarter || a.residential || '';
        const place = a.village || a.town || a.city_district || '';
        const city = a.city || a.town || a.county || 'Mangaluru';
        const state = a.state || 'Karnataka';
        const pincode = a.postcode || '';

        const parts = [locality, area, place, city, state, pincode]
          .map(p => p?.trim())
          .filter((p, idx, arr) => p && arr.indexOf(p) === idx);

        const formatted = parts.join(', ') || data.display_name;
        const short = locality ? `${locality}, ${city}` : `${area || city}, ${state}`;

        return {
          formattedAddress: formatted,
          shortAddress: short,
          city,
          state,
          pincode,
          latitude,
          longitude,
        };
      }
    }
  } catch (nomErr) {
    console.warn('[locationService] Nominatim reverse geocode fallback:', nomErr);
  }

  // Strategy 3: Graceful coordinate placeholder
  const fallbackFormatted = `Pickup Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
  return {
    formattedAddress: fallbackFormatted,
    shortAddress: fallbackFormatted,
    city: 'Selected Location',
    state: '',
    pincode: '',
    latitude,
    longitude,
  };
}
