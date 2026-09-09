export interface MangaluruLocation {
  id: string;
  displayName: string;
  searchName: string;
  category: 'AIRPORT' | 'RAILWAY_STATION' | 'POPULAR_DESTINATION' | 'TEMPLE_OUTSTATION' | 'INTERCITY';
  address: string;
  latitude: number;
  longitude: number;
  distanceKmFromMangaluru: number;
  displayOrder: number;
  isPopular: boolean;
  isActive: boolean;
}

const initialLocations: MangaluruLocation[] = [
  {
    id: 'loc_ixe_airport',
    displayName: 'Mangaluru International Airport (IXE)',
    searchName: 'mangaluru airport ixe bajpe international flight',
    category: 'AIRPORT',
    address: 'Kenjar, Bajpe, Mangaluru, Karnataka 574142',
    latitude: 12.9613,
    longitude: 74.8901,
    distanceKmFromMangaluru: 15,
    displayOrder: 1,
    isPopular: true,
    isActive: true,
  },
  {
    id: 'loc_udupi_krishna',
    displayName: 'Udupi Sri Krishna Matha / City',
    searchName: 'udupi krishna temple matha city car street',
    category: 'POPULAR_DESTINATION',
    address: 'Car Street, Udupi, Karnataka 576101',
    latitude: 13.3409,
    longitude: 74.7421,
    distanceKmFromMangaluru: 60,
    displayOrder: 2,
    isPopular: true,
    isActive: true,
  },
  {
    id: 'loc_kollur_mookambika',
    displayName: 'Kollur Mookambika Temple',
    searchName: 'kollur mookambika temple udupi district outstation',
    category: 'TEMPLE_OUTSTATION',
    address: 'Kollur, Byndoor Taluk, Udupi, Karnataka 576220',
    latitude: 13.8647,
    longitude: 74.8119,
    distanceKmFromMangaluru: 130,
    displayOrder: 3,
    isPopular: true,
    isActive: true,
  },
  {
    id: 'loc_dharmasthala',
    displayName: 'Dharmasthala Sri Manjunatha Temple',
    searchName: 'dharmasthala manjunatha temple dakshina kannada',
    category: 'TEMPLE_OUTSTATION',
    address: 'Dharmasthala, Belthangady, Karnataka 574216',
    latitude: 12.9564,
    longitude: 75.3804,
    distanceKmFromMangaluru: 75,
    displayOrder: 4,
    isPopular: true,
    isActive: true,
  },
  {
    id: 'loc_kukke_subrahmanya',
    displayName: 'Kukke Sri Subrahmanya Temple',
    searchName: 'kukke subrahmanya temple sullia dakshina kannada',
    category: 'TEMPLE_OUTSTATION',
    address: 'Subrahmanya, Sullia Taluk, Karnataka 574238',
    latitude: 12.6644,
    longitude: 75.6174,
    distanceKmFromMangaluru: 105,
    displayOrder: 5,
    isPopular: true,
    isActive: true,
  },
  {
    id: 'loc_manipal_mit',
    displayName: 'Manipal University / MIT Campus',
    searchName: 'manipal university mit campus udupi mahe hospital',
    category: 'POPULAR_DESTINATION',
    address: 'Madhav Nagar, Manipal, Karnataka 576104',
    latitude: 13.3525,
    longitude: 74.7928,
    distanceKmFromMangaluru: 65,
    displayOrder: 6,
    isPopular: true,
    isActive: true,
  },
  {
    id: 'loc_maq_central',
    displayName: 'Mangaluru Central Railway Station (MAQ)',
    searchName: 'mangaluru central railway station maq hampankatta',
    category: 'RAILWAY_STATION',
    address: 'Old Kent Road, Hampankatta, Mangaluru, Karnataka 575001',
    latitude: 12.8644,
    longitude: 74.8427,
    distanceKmFromMangaluru: 2,
    displayOrder: 7,
    isPopular: true,
    isActive: true,
  },
  {
    id: 'loc_majn_junction',
    displayName: 'Mangaluru Junction Railway Station (MAJN)',
    searchName: 'mangaluru junction railway station majn kankanady padil',
    category: 'RAILWAY_STATION',
    address: 'Darbar Hill, Padil, Kankanady, Mangaluru, Karnataka 575007',
    latitude: 12.8687,
    longitude: 74.8690,
    distanceKmFromMangaluru: 5,
    displayOrder: 8,
    isPopular: false,
    isActive: true,
  },
  {
    id: 'loc_murdeshwar',
    displayName: 'Murdeshwar Shiva Temple & Beach',
    searchName: 'murdeshwar shiva temple beach bhatkal uttara kannada',
    category: 'TEMPLE_OUTSTATION',
    address: 'Murdeshwar, Uttara Kannada, Karnataka 581350',
    latitude: 14.0940,
    longitude: 74.4899,
    distanceKmFromMangaluru: 155,
    displayOrder: 9,
    isPopular: true,
    isActive: true,
  },
  {
    id: 'loc_gokarna',
    displayName: 'Gokarna Mahabaleshwar Temple & Om Beach',
    searchName: 'gokarna mahabaleshwar temple om beach uttara kannada',
    category: 'POPULAR_DESTINATION',
    address: 'Gokarna, Uttara Kannada, Karnataka 581326',
    latitude: 14.5433,
    longitude: 74.3168,
    distanceKmFromMangaluru: 230,
    displayOrder: 10,
    isPopular: false,
    isActive: true,
  },
  {
    id: 'loc_bekal_fort',
    displayName: 'Kasargod / Bekal Fort (Kerala)',
    searchName: 'kasargod bekal fort kerala beach palace',
    category: 'INTERCITY',
    address: 'Bekal Fort, Kasaragod District, Kerala 671316',
    latitude: 12.3920,
    longitude: 75.0345,
    distanceKmFromMangaluru: 60,
    displayOrder: 11,
    isPopular: false,
    isActive: true,
  },
  {
    id: 'loc_bengaluru',
    displayName: 'Bengaluru City / Kempegowda Airport (BLR)',
    searchName: 'bengaluru bangalore kempegowda airport blr majestic',
    category: 'INTERCITY',
    address: 'Majestic / Devanahalli, Bengaluru, Karnataka 560001',
    latitude: 12.9716,
    longitude: 77.5946,
    distanceKmFromMangaluru: 350,
    displayOrder: 12,
    isPopular: true,
    isActive: true,
  },
  {
    id: 'loc_coorg_madikeri',
    displayName: 'Coorg / Madikeri Coffee Highlands',
    searchName: 'coorg madikeri coffee estate kodagu hill station',
    category: 'INTERCITY',
    address: 'Madikeri, Kodagu District, Karnataka 571201',
    latitude: 12.4244,
    longitude: 75.7382,
    distanceKmFromMangaluru: 140,
    displayOrder: 13,
    isPopular: false,
    isActive: true,
  },
  {
    id: 'loc_surathkal_nitk',
    displayName: 'Surathkal NITK Campus & Beach Lighthouse',
    searchName: 'surathkal nitk campus beach lighthouse national institute',
    category: 'POPULAR_DESTINATION',
    address: 'NITK Surathkal, Srinivasnagar, Mangaluru, Karnataka 575025',
    latitude: 13.0108,
    longitude: 74.7943,
    distanceKmFromMangaluru: 18,
    displayOrder: 14,
    isPopular: false,
    isActive: true,
  },
];

let mangaluruLocationsStore = [...initialLocations];

/**
 * Server-Side Location Search & Query Engine
 */
export function searchLocations(query?: string, onlyPopular?: boolean): MangaluruLocation[] {
  let result = mangaluruLocationsStore.filter((loc) => loc.isActive);

  if (onlyPopular) {
    result = result.filter((loc) => loc.isPopular);
  }

  if (query && query.trim()) {
    const q = query.toLowerCase().trim();
    result = result.filter(
      (loc) =>
        loc.displayName.toLowerCase().includes(q) ||
        loc.searchName.toLowerCase().includes(q) ||
        loc.address.toLowerCase().includes(q)
    );
  }

  return result.sort((a, b) => a.displayOrder - b.displayOrder);
}

/**
 * Admin CRUD Operations
 */
export function addMangaluruLocation(
  loc: Omit<MangaluruLocation, 'id'>
): MangaluruLocation {
  const newLoc: MangaluruLocation = {
    ...loc,
    id: `loc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
  };
  mangaluruLocationsStore.push(newLoc);
  return newLoc;
}

export function updateMangaluruLocation(
  id: string,
  updates: Partial<MangaluruLocation>
): MangaluruLocation | null {
  const loc = mangaluruLocationsStore.find((l) => l.id === id);
  if (!loc) return null;

  Object.assign(loc, updates);
  return loc;
}

export function reorderLocations(orderedIds: string[]): boolean {
  orderedIds.forEach((id, index) => {
    const loc = mangaluruLocationsStore.find((l) => l.id === id);
    if (loc) loc.displayOrder = index + 1;
  });
  return true;
}

export function getAllLocationsAdmin(): MangaluruLocation[] {
  return [...mangaluruLocationsStore].sort((a, b) => a.displayOrder - b.displayOrder);
}
