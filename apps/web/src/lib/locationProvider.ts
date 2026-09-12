/**
 * Pluggable Location Data Provider Engine for Kandy Cabs
 * Supports 100% FREE OpenStreetMap / Photon / Nominatim Geocoding
 * + Seamless Google Places API integration when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is available.
 */

export interface SelectedLocation {
  placeName: string;
  address: string;
  latitude: number;
  longitude: number;
  placeId?: string;
  isSelected: boolean;
}

const POPULAR_AIRPORTS: SelectedLocation[] = [
  {
    placeName: 'Mangalore International Airport (IXE)',
    address: 'Bajpe, Mangaluru, Karnataka, India',
    latitude: 12.9613,
    longitude: 74.8901,
    placeId: 'airport_ixe',
    isSelected: true,
  },
  {
    placeName: 'Kempegowda International Airport (BLR)',
    address: 'Devanahalli, Bengaluru, Karnataka, India',
    latitude: 13.1986,
    longitude: 77.7066,
    placeId: 'airport_blr',
    isSelected: true,
  },
  {
    placeName: 'Cochin International Airport (COK)',
    address: 'Nedumbassery, Kochi, Kerala, India',
    latitude: 10.152,
    longitude: 76.4019,
    placeId: 'airport_cok',
    isSelected: true,
  },
  {
    placeName: 'Calicut International Airport (CCJ)',
    address: 'Karipur, Kozhikode, Kerala, India',
    latitude: 11.1368,
    longitude: 75.9553,
    placeId: 'airport_ccj',
    isSelected: true,
  },
  {
    placeName: 'Goa Dabolim International Airport (GOI)',
    address: 'Dabolim, Vasco da Gama, Goa, India',
    latitude: 15.3808,
    longitude: 73.8314,
    placeId: 'airport_goi',
    isSelected: true,
  },
  {
    placeName: 'Manohar International Airport (GOX)',
    address: 'Mopa, Pernem, North Goa, India',
    latitude: 15.7483,
    longitude: 73.8647,
    placeId: 'airport_gox',
    isSelected: true,
  },
  {
    placeName: 'Chennai International Airport (MAA)',
    address: 'Meenambakkam, Chennai, Tamil Nadu, India',
    latitude: 12.9941,
    longitude: 80.1709,
    placeId: 'airport_maa',
    isSelected: true,
  },
  {
    placeName: 'Hyderabad Rajiv Gandhi Intl Airport (HYD)',
    address: 'Shamshabad, Hyderabad, Telangana, India',
    latitude: 17.2403,
    longitude: 78.4294,
    placeId: 'airport_hyd',
    isSelected: true,
  },
];

export const POPULAR_CITIES: SelectedLocation[] = [
  {
    placeName: 'Mangaladevi Temple, Mangaluru',
    address: 'Bolar, Mangaluru, Karnataka 575001',
    latitude: 12.8532,
    longitude: 74.8398,
    placeId: 'loc_mangaladevi',
    isSelected: true,
  },
  {
    placeName: 'Mangaluru Central Railway Station (MAQ)',
    address: 'Hampankatta, Mangaluru, Karnataka 575001',
    latitude: 12.8687,
    longitude: 74.8427,
    placeId: 'loc_mangalore_railway',
    isSelected: true,
  },
  {
    placeName: 'Mangalore International Airport (IXE)',
    address: 'Bajpe, Mangaluru, Karnataka 574142',
    latitude: 12.9613,
    longitude: 74.8901,
    placeId: 'airport_ixe',
    isSelected: true,
  },
  {
    placeName: 'Kadri Manjunath Temple, Mangaluru',
    address: 'Kadri, Mangaluru, Karnataka 575002',
    latitude: 12.8885,
    longitude: 74.8569,
    placeId: 'loc_kadri',
    isSelected: true,
  },
  {
    placeName: 'Surathkal / NITK Beach',
    address: 'Surathkal, Mangaluru, Karnataka 575014',
    latitude: 13.0084,
    longitude: 74.7946,
    placeId: 'loc_surathkal',
    isSelected: true,
  },
  {
    placeName: 'Udupi Sri Krishna Temple',
    address: 'Car Street, Tenkapet, Udupi, Karnataka 576101',
    latitude: 13.3409,
    longitude: 74.7421,
    placeId: 'loc_udupi_krishna',
    isSelected: true,
  },
  {
    placeName: 'Bangalore, Karnataka',
    address: 'Bengaluru, Karnataka, India',
    latitude: 12.9716,
    longitude: 77.5946,
    placeId: 'city_bangalore',
    isSelected: true,
  },
  {
    placeName: 'Mangaluru, Karnataka',
    address: 'Dakshina Kannada, Karnataka, India',
    latitude: 12.9141,
    longitude: 74.856,
    placeId: 'city_mangalore',
    isSelected: true,
  },
  {
    placeName: 'Coorg (Madikeri), Karnataka',
    address: 'Madikeri, Kodagu, Karnataka, India',
    latitude: 12.4244,
    longitude: 75.7382,
    placeId: 'city_coorg',
    isSelected: true,
  },
  {
    placeName: 'Mysore, Karnataka',
    address: 'Mysuru, Karnataka, India',
    latitude: 12.2958,
    longitude: 76.6394,
    placeId: 'city_mysore',
    isSelected: true,
  },
  {
    placeName: 'Udupi / Manipal, Karnataka',
    address: 'Udupi, Karnataka, India',
    latitude: 13.3409,
    longitude: 74.7421,
    placeId: 'city_udupi',
    isSelected: true,
  },
  {
    placeName: 'Goa',
    address: 'Goa, India',
    latitude: 15.2993,
    longitude: 74.124,
    placeId: 'city_goa',
    isSelected: true,
  },
  {
    placeName: 'New Delhi, Delhi',
    address: 'New Delhi, National Capital Territory of Delhi, India',
    latitude: 28.6139,
    longitude: 77.209,
    placeId: 'city_delhi',
    isSelected: true,
  },
  {
    placeName: 'Mumbai, Maharashtra',
    address: 'Mumbai, Maharashtra, India',
    latitude: 19.076,
    longitude: 72.8777,
    placeId: 'city_mumbai',
    isSelected: true,
  },
  {
    placeName: 'Chennai, Tamil Nadu',
    address: 'Chennai, Tamil Nadu, India',
    latitude: 13.0827,
    longitude: 80.2707,
    placeId: 'city_chennai',
    isSelected: true,
  },
  {
    placeName: 'Hyderabad, Telangana',
    address: 'Hyderabad, Telangana, India',
    latitude: 17.385,
    longitude: 78.4867,
    placeId: 'city_hyderabad',
    isSelected: true,
  },
  {
    placeName: 'Ahmedabad, Gujarat',
    address: 'Ahmedabad, Gujarat, India',
    latitude: 23.0225,
    longitude: 72.5714,
    placeId: 'city_ahmedabad',
    isSelected: true,
  },
  {
    placeName: 'Pune, Maharashtra',
    address: 'Pune, Maharashtra, India',
    latitude: 18.5204,
    longitude: 73.8567,
    placeId: 'city_pune',
    isSelected: true,
  },
];

/**
 * Searches real places, landmarks, roads, temples, businesses, and addresses.
 * Uses Photon/Nominatim (OpenStreetMap) as 100% FREE default provider.
 * Uses Google Places API when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is supplied.
 */
export async function searchLocations(
  query: string,
  isAirportOnly: boolean = false
): Promise<SelectedLocation[]> {
  const trimmed = query.trim();

  // If Airport transfer mode, filter popular airports first
  if (isAirportOnly) {
    if (!trimmed) return POPULAR_AIRPORTS;
    const qLower = trimmed.toLowerCase();
    const matchedAirports = POPULAR_AIRPORTS.filter(
      (a) =>
        a.placeName.toLowerCase().includes(qLower) ||
        a.address.toLowerCase().includes(qLower)
    );
    if (matchedAirports.length > 0) return matchedAirports;
  }

  if (!trimmed || trimmed.length < 2) {
    return isAirportOnly ? POPULAR_AIRPORTS : POPULAR_CITIES;
  }

  // Google Places API Check (if environment variable exists)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (apiKey && apiKey !== 'AIzaSyDemoKeyForGoogleMapsPlatform') {
    try {
      const res = await fetch(
        `/api/places/autocomplete?input=${encodeURIComponent(trimmed)}&isAirport=${isAirportOnly}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          return data.results;
        }
      }
    } catch (e) {
      console.warn('Google Places API proxy failed, falling back to OpenStreetMap:', e);
    }
  }

  // 100% FREE Provider: Photon / OpenStreetMap Geocoding (Restricted to India)
  try {
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
      trimmed + ' India'
    )}&limit=8&lang=en`;

    const res = await fetch(photonUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        const results: SelectedLocation[] = data.features
          .map((feat: any) => {
            const props = feat.properties || {};
            const coords = feat.geometry?.coordinates || [74.856, 12.9141];
            
            const placeName =
              props.name ||
              props.street ||
              props.district ||
              props.city ||
              'Selected Location';
            
            const addressParts = [
              props.street,
              props.district || props.suburb,
              props.city || props.county,
              props.state,
              props.country,
            ].filter(Boolean);

            const address =
              addressParts.length > 0
                ? Array.from(new Set(addressParts)).join(', ')
                : 'India';

            return {
              placeName,
              address,
              latitude: coords[1],
              longitude: coords[0],
              placeId: `osm_${props.osm_id || Math.random().toString(36).substring(2, 9)}`,
              isSelected: true,
            };
          })
          .filter(
            (item: SelectedLocation, index: number, self: SelectedLocation[]) =>
              index === self.findIndex((t) => t.placeName === item.placeName && t.address === item.address)
          );

        if (results.length > 0) {
          return isAirportOnly
            ? [...POPULAR_AIRPORTS, ...results]
            : results;
        }
      }
    }
  } catch (err) {
    console.warn('Photon API fetch error, trying Nominatim fallback:', err);
  }

  // Nominatim Fallback API (OpenStreetMap)
  try {
    const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      trimmed
    )}&countrycodes=in&limit=8&addressdetails=1`;

    const res = await fetch(nomUrl, {
      headers: {
        'Accept-Language': 'en-US,en',
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any) => {
          const name = item.name || item.display_name.split(',')[0];
          const parts = item.display_name.split(',');
          const address = parts.slice(1).join(',').trim();

          return {
            placeName: name,
            address: address || item.display_name,
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
            placeId: `nom_${item.place_id}`,
            isSelected: true,
          };
        });
      }
    }
  } catch (err) {
    console.warn('Nominatim fallback failed:', err);
  }

  return isAirportOnly ? POPULAR_AIRPORTS : [];
}

/**
 * Calculates accurate Haversine distance in kilometers between two lat/lng coordinates.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;

  const R = 6371; // Radius of Earth in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const directDistance = R * c;

  // Real road driving distance is roughly 1.25x - 1.35x direct straight-line distance
  return Math.max(1, Math.ceil(directDistance * 1.3));
}
