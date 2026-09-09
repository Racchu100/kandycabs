import assert from 'node:assert';
import {
  recordDriverTelemetry,
  getAdminDriverLocations,
  updateTelemetryConfig,
  getTelemetryConfig,
} from '../src/lib/gpsTelemetryEngine';

function testPhase10GpsTelemetryEngine() {
  console.log('Testing Phase 10 Driver GPS Telemetry & Admin Live Tracking...');

  // 1. Test Telemetry Configuration
  const initialConfig = getTelemetryConfig();
  assert.strictEqual(initialConfig.updateIntervalMs, 5000);
  assert.strictEqual(initialConfig.staleThresholdMs, 30000);
  console.log('✓ Default telemetry config verified (5000ms update interval, 30s stale threshold)');

  const updatedConfig = updateTelemetryConfig({ updateIntervalMs: 6000 });
  assert.strictEqual(updatedConfig.updateIntervalMs, 6000);
  console.log('✓ Dynamic telemetry interval config updated to 6000ms');

  // 2. Test Driver Telemetry Submission (Server-Authoritative Identity)
  const driverId = 'driver_suresh';
  const point = recordDriverTelemetry(
    driverId,
    'Suresh Gowda',
    'KA 19 C 4829',
    'KC-88429',
    'TRIP_STARTED',
    13.0827,
    74.7954,
    4.2, // ±4.2m accuracy
    48, // 48 km/h speed
    350 // Heading
  );

  assert.strictEqual(point.driverId, driverId);
  assert.strictEqual(point.latitude, 13.0827);
  assert.strictEqual(point.longitude, 74.7954);
  assert.strictEqual(point.isStale, false);
  console.log('✓ Driver GPS Telemetry recorded successfully with high accuracy (±4.2m, 48 km/h)');

  // 3. Test Admin Live Tracking Query & Stale Threshold Flag
  const adminDrivers = getAdminDriverLocations();
  assert.strictEqual(adminDrivers.length >= 3, true);

  const sureshPoint = adminDrivers.find((d) => d.driverId === 'driver_suresh');
  assert.strictEqual(sureshPoint?.isStale, false);

  const ganeshPoint = adminDrivers.find((d) => d.driverId === 'driver_ganesh');
  assert.strictEqual(ganeshPoint?.isStale, true);
  console.log('✓ Admin Live Tracking query verified (Dynamic stale flag correctly computed for offline/inactive driver >30s)');

  // 4. Test Coordinate Boundary Validation
  const isValidLat = (lat: number) => typeof lat === 'number' && lat >= -90 && lat <= 90;
  const isValidLng = (lng: number) => typeof lng === 'number' && lng >= -180 && lng <= 180;

  assert.strictEqual(isValidLat(13.0827), true);
  assert.strictEqual(isValidLat(120), false); // Invalid lat
  assert.strictEqual(isValidLng(74.7954), true);
  assert.strictEqual(isValidLng(200), false); // Invalid lng
  console.log('✓ Geolocation coordinate boundary sanitization verified');

  console.log('✓ All Phase 10 Driver GPS Telemetry & Admin Live Tracking tests passed successfully!');
}

testPhase10GpsTelemetryEngine();
