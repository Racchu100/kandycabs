import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const input = searchParams.get('input');
  const isAirport = searchParams.get('isAirport') === 'true';

  if (!input) {
    return NextResponse.json({ results: [] });
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey || apiKey === 'AIzaSyDemoKeyForGoogleMapsPlatform') {
    return NextResponse.json({ results: [] });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
      input
    )}&components=country:in&key=${apiKey}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.status === 'OK' && Array.isArray(data.predictions)) {
      const results = data.predictions.map((p: any) => {
        const primaryText =
          p.structured_formatting?.main_text || p.description.split(',')[0];
        const secondaryText =
          p.structured_formatting?.secondary_text ||
          p.description.split(',').slice(1).join(',').trim();

        return {
          placeName: primaryText,
          address: secondaryText || p.description,
          latitude: 0, // Geocoded on selection or via Place Details
          longitude: 0,
          placeId: p.place_id,
          isSelected: true,
        };
      });

      return NextResponse.json({ results });
    }
  } catch (err) {
    console.error('Google Places Autocomplete Proxy Error:', err);
  }

  return NextResponse.json({ results: [] });
}
