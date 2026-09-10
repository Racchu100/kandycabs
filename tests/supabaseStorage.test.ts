import { formatCabPhotoStoragePath, BUCKET_NAME } from '../src/lib/supabaseStorage';

function runSupabaseStorageTests() {
  console.log('--- Running Supabase Storage Utility Unit Tests ---');

  // Test 1: Bucket name
  if (BUCKET_NAME !== 'cab-photos') {
    throw new Error(`Expected bucket name 'cab-photos', got '${BUCKET_NAME}'`);
  }
  console.log('✓ Storage bucket name verified as cab-photos');

  // Test 2: Path formatting for exterior photo
  const path1 = formatCabPhotoStoragePath({
    driverId: 'driver_suresh',
    vehicleId: 'KA 19 C 4829',
    category: 'exterior',
    fileName: 'front',
  });
  const expectedPath1 = 'driver/driver_suresh/vehicle/ka_19_c_4829/exterior/front.webp';
  if (path1 !== expectedPath1) {
    throw new Error(`Expected path '${expectedPath1}', got '${path1}'`);
  }
  console.log(`✓ Exterior photo path verified: ${path1}`);

  // Test 3: Path formatting for interior photo
  const path2 = formatCabPhotoStoragePath({
    driverId: 'driver_suresh',
    vehicleId: 'KA 19 C 4829',
    category: 'interior',
    fileName: 'front',
  });
  const expectedPath2 = 'driver/driver_suresh/vehicle/ka_19_c_4829/interior/front.webp';
  if (path2 !== expectedPath2) {
    throw new Error(`Expected path '${expectedPath2}', got '${path2}'`);
  }
  console.log(`✓ Interior photo path verified: ${path2}`);

  // Test 4: Path formatting for odometer photo
  const path3 = formatCabPhotoStoragePath({
    driverId: 'driver_suresh',
    vehicleId: 'KA 19 C 4829',
    category: 'odometer',
    fileName: 'KC-88429_pickup',
  });
  const expectedPath3 = 'driver/driver_suresh/vehicle/ka_19_c_4829/odometer/kc-88429_pickup.webp';
  if (path3 !== expectedPath3) {
    throw new Error(`Expected path '${expectedPath3}', got '${path3}'`);
  }
  console.log(`✓ Odometer photo path verified: ${path3}`);

  console.log('🎉 ALL SUPABASE STORAGE UNIT TESTS PASSED!');
}

runSupabaseStorageTests();
