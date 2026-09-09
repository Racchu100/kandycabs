import { NextResponse } from 'next/server';
import { extractBearerToken, verifyToken } from '@/lib/auth';
import {
  searchLocations,
  getAllLocationsAdmin,
  addMangaluruLocation,
  updateMangaluruLocation,
  reorderLocations,
} from '@/lib/mangaluruLocationsEngine';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query') || '';
  const popular = searchParams.get('popular') === 'true';
  const isAdmin = searchParams.get('admin') === 'true';

  if (isAdmin) {
    const locations = getAllLocationsAdmin();
    return NextResponse.json({ success: true, count: locations.length, locations });
  }

  const locations = searchLocations(query, popular);
  return NextResponse.json({
    success: true,
    count: locations.length,
    locations,
  });
}

export async function POST(request: Request) {
  try {
    const token = extractBearerToken(request.headers.get('authorization'));
    const auth = verifyToken(token || '');

    if (!auth || auth.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin authorization required' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    // Action 1: Reorder Locations
    if (action === 'REORDER') {
      const { orderedIds } = body;
      if (!Array.isArray(orderedIds)) {
        return NextResponse.json({ error: 'orderedIds array required' }, { status: 400 });
      }
      reorderLocations(orderedIds);
      return NextResponse.json({ success: true, message: 'Locations reordered successfully' });
    }

    // Action 2: Create New Location
    const {
      displayName,
      searchName,
      category = 'POPULAR_DESTINATION',
      address,
      latitude,
      longitude,
      distanceKmFromMangaluru = 50,
      displayOrder = 99,
      isPopular = false,
      isActive = true,
    } = body;

    if (!displayName || !address || typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { error: 'displayName, address, latitude, and longitude are required' },
        { status: 400 }
      );
    }

    const newLoc = addMangaluruLocation({
      displayName,
      searchName: searchName || `${displayName} ${address}`.toLowerCase(),
      category,
      address,
      latitude,
      longitude,
      distanceKmFromMangaluru,
      displayOrder,
      isPopular,
      isActive,
    });

    return NextResponse.json({ success: true, location: newLoc });
  } catch {
    return NextResponse.json({ error: 'Failed to process location creation' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const token = extractBearerToken(request.headers.get('authorization'));
    const auth = verifyToken(token || '');

    if (!auth || auth.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin authorization required' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'location id is required' }, { status: 400 });
    }

    const updated = updateMangaluruLocation(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, location: updated });
  } catch {
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 });
  }
}
