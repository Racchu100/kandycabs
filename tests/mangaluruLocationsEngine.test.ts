import assert from 'node:assert';
import {
  searchLocations,
  getAllLocationsAdmin,
  addMangaluruLocation,
  updateMangaluruLocation,
  reorderLocations,
} from '../src/lib/mangaluruLocationsEngine';

function testPhase13MangaluruLocationsEngine() {
  console.log('Testing Phase 13 Mangaluru One-Way Locations Management System...');

  // 1. Test Authentic Coastal Catalog Initialization
  const allLocs = getAllLocationsAdmin();
  assert.strictEqual(allLocs.length >= 14, true);

  const ixe = allLocs.find((l) => l.id === 'loc_ixe_airport');
  assert.strictEqual(ixe?.displayName, 'Mangaluru International Airport (IXE)');
  assert.strictEqual(ixe?.latitude, 12.9613);
  console.log('✓ Authentic coastal Karnataka catalog loaded with Mangaluru Airport (IXE) & Udupi');

  // 2. Test Server-Side Location Search & Popular Filter
  const udupiResults = searchLocations('udupi');
  assert.strictEqual(udupiResults.length >= 2, true);
  assert.strictEqual(udupiResults.some((l) => l.displayName.includes('Udupi')), true);
  console.log('✓ Server-side search for "udupi" returned matching coastal locations');

  const popularResults = searchLocations('', true);
  assert.strictEqual(popularResults.every((l) => l.isPopular), true);
  console.log('✓ Popular destinations filter verified');

  // 3. Test Admin CRUD: Add New Location
  const createdLoc = addMangaluruLocation({
    displayName: 'Maravanthe Beach Highway Corridor',
    searchName: 'maravanthe beach highway trasi udupi scenic coast',
    category: 'POPULAR_DESTINATION',
    address: 'NH 66, Maravanthe, Kundapura, Udupi 576224',
    latitude: 13.7088,
    longitude: 74.6534,
    distanceKmFromMangaluru: 110,
    displayOrder: 15,
    isPopular: true,
    isActive: true,
  });
  assert.strictEqual(createdLoc.displayName, 'Maravanthe Beach Highway Corridor');
  console.log('✓ Admin Add Location created new destination record with coordinates');

  // 4. Test Admin Location Update & Deactivation
  const updated = updateMangaluruLocation(createdLoc.id, { isActive: false });
  assert.strictEqual(updated?.isActive, false);
  console.log('✓ Admin location active state toggled');

  // 5. Test Priority Reordering
  const reorderRes = reorderLocations(['loc_udupi_krishna', 'loc_ixe_airport']);
  assert.strictEqual(reorderRes, true);
  const reorderedLocs = getAllLocationsAdmin();
  assert.strictEqual(reorderedLocs[0].id, 'loc_udupi_krishna');
  console.log('✓ Admin location display priority reordering verified');

  console.log('✓ All Phase 13 Mangaluru One-Way Locations tests passed successfully!');
}

testPhase13MangaluruLocationsEngine();
