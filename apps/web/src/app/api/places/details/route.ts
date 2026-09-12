import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const placeId = searchParams.get('placeId');

  if (!placeId) {
    return NextResponse.json({ error: 'Missing placeId' }, { status: 400 });
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey || apiKey === 'AIzaSyDemoKeyForGoogleMapsPlatform') {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
      placeId
    )}&fields=name,formatted_address,geometry,place_id&key=${apiKey}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.status === 'OK' && data.result) {
      const result = data.result;
      return NextResponse.json({
        placeName: result.name || result.formatted_address.split(',')[0],
        address: result.formatted_address,
        latitude: result.geometry?.location?.lat || 0,
        longitude: result.geometry?.location?.lng || 0,
        placeId: result.place_id,
        isSelected: true,
      });
    }
  } catch (err) {
    console.error('Google Place Details Proxy Error:', err);
  }

  return NextResponse.json({ error: 'Failed to fetch place details' }, { status: 500 });
}
