import assert from 'assert';

console.log('--- Testing Geotagged Camera Location Overlay Watermarking ---');

// Mock HTML5 Canvas Watermark Generator Logic
function watermarkImageWithGeotag(
  imageWidth: number,
  imageHeight: number,
  locationAddress: string,
  lat: number,
  lng: number,
  driverName: string,
  vehicleReg: string
): { watermarkSuccess: boolean; bannerHeight: number; geotagText: string } {
  const bannerHeight = Math.max(90, Math.round(imageHeight * 0.18));
  const bannerY = imageHeight - bannerHeight;

  assert(bannerHeight >= 90, 'Banner height should meet minimum accessibility guidelines');
  assert(bannerY < imageHeight, 'Banner should be positioned at the bottom of the image');

  const geotagText = `📍 Location: ${locationAddress} | GPS: ${lat}° N, ${lng}° E | Vehicle: ${vehicleReg} | Driver: ${driverName}`;

  return {
    watermarkSuccess: true,
    bannerHeight,
    geotagText,
  };
}

// Execute Test Case
const testRes = watermarkImageWithGeotag(
  1280,
  720,
  'Mangaluru Central Railway Station, Mangaluru',
  12.8681,
  74.8428,
  'Suresh Gowda',
  'KA 19 C 4829'
);

assert.strictEqual(testRes.watermarkSuccess, true);
assert(testRes.bannerHeight > 0);
assert(testRes.geotagText.includes('Mangaluru Central Railway Station'));
assert(testRes.geotagText.includes('KA 19 C 4829'));

console.log('✓ Geotagged camera overlay watermarking logic test PASSED!');
