import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng parameters required' }, { status: 400 });
  }

  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);

  try {
    // Fetch hyper-local address from OpenStreetMap Nominatim with zoom level 18 (street/building level)
    const nomRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'KandyCabsApp/1.0 (operations@kandycabs.com)',
          'Accept-Language': 'en',
        },
      }
    );

    if (nomRes.ok) {
      const data = await nomRes.json();
      if (data && data.address) {
        const a = data.address;
        const locality = a.road || a.pedestrian || a.amenity || a.building || a.house_number || '';
        const area = a.suburb || a.neighbourhood || a.quarter || a.residential || '';
        const place = a.village || a.town || a.city_district || '';
        const pincode = a.postcode || '';
        const city = a.city || a.town || a.county || 'Mangaluru';
        const district = a.state_district || a.county || 'Dakshina Kannada';
        const state = a.state || 'Karnataka';

        const orderedParts = [locality, area, place, pincode, city, district, state]
          .map((p: string) => p?.trim())
          .filter((p: string, idx: number, arr: string[]) => p && arr.indexOf(p) === idx);

        if (orderedParts.length > 0) {
          const exactName = orderedParts.join(', ');
          return NextResponse.json({
            success: true,
            exactLocationName: exactName,
            displayName: data.display_name,
            address: data.address,
          });
        }
      } else if (data && data.display_name) {
        const rawParts = data.display_name
          .split(',')
          .map((p: string) => p.trim())
          .filter((p: string) => p !== 'India' && !p.endsWith(' taluk'));
        const exactName = Array.from(new Set(rawParts)).join(', ');

        return NextResponse.json({
          success: true,
          exactLocationName: exactName,
          displayName: data.display_name,
        });
      }
    }

    // Fallback 1: BigDataCloud Client Reverse Geocode
    const bdcRes = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    );
    if (bdcRes.ok) {
      const bdcData = await bdcRes.json();
      if (bdcData) {
        const locality = bdcData.locality || bdcData.city || '';
        const area = bdcData.localityInfo?.informative?.find((i: any) => i.order === 9 || i.description === 'suburb')?.name || '';
        const place = bdcData.localityInfo?.administrative?.find((a: any) => a.order === 9)?.name || '';
        const pincode = bdcData.postcode || '575003';
        const city = bdcData.city || 'Mangaluru';
        const district = bdcData.localityInfo?.administrative?.find((a: any) => a.name?.includes('district'))?.name?.replace(' district', '') || 'Dakshina Kannada';
        const state = bdcData.principalSubdivision || 'Karnataka';

        const parts = [locality, area, place, pincode, city, district, state]
          .map((p: string) => p?.trim())
          .filter((p: string, idx: number, arr: string[]) => p && arr.indexOf(p) === idx);

        if (parts.length > 0) {
          return NextResponse.json({
            success: true,
            exactLocationName: parts.join(', '),
          });
        }
      }
    }

    // Return Address unavailable if reverse geocoding fails, do NOT return stale hardcoded fallbacks
    return NextResponse.json({
      success: true,
      exactLocationName: 'Address unavailable',
    });
  } catch (err: any) {
    return NextResponse.json({
      success: true,
      exactLocationName: 'Address unavailable',
    });
  }
}
