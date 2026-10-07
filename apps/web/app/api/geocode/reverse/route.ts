import { NextRequest, NextResponse } from 'next/server';
import { reverseGeocodeCoordinates } from '@/lib/geocoding';
import { setCorsHeaders, handleOptions } from '@/lib/cors';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const latStr = searchParams.get('lat');
    const lngStr = searchParams.get('lng');

    if (!latStr || !lngStr) {
      const res = NextResponse.json(
        { success: false, message: 'lat and lng query parameters required' },
        { status: 400 }
      );
      return setCorsHeaders(res);
    }

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      const res = NextResponse.json(
        { success: false, message: 'Invalid coordinate values' },
        { status: 400 }
      );
      return setCorsHeaders(res);
    }

    const { address, cached } = await reverseGeocodeCoordinates(lat, lng);

    const res = NextResponse.json(
      {
        success: true,
        address,
        cached,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
    return setCorsHeaders(res);
  } catch (error: any) {
    const res = NextResponse.json(
      { success: false, message: error.message || 'Geocoding failed' },
      { status: 500 }
    );
    return setCorsHeaders(res);
  }
}
