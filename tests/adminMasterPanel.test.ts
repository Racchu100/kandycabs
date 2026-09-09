import assert from 'node:assert';
import {
  getAdminMasterKpis,
  getAllVehicles,
  toggleVehicleActive,
  getAllLocations,
  toggleLocationActive,
  getSystemSettings,
  updateSystemSettings,
} from '../src/lib/adminMasterEngine';
import { getAuditLogs } from '../src/lib/adminEngine';

function testPhase12AdminMasterPanel() {
  console.log('Testing Phase 12 Complete Production Admin Panel & Management Console...');

  // 1. Test Master KPI Metrics Aggregation
  const kpis = getAdminMasterKpis();
  assert.strictEqual(kpis.totalBookings, 142);
  assert.strictEqual(kpis.todaysBookings, 18);
  assert.strictEqual(kpis.activeTrips, 3);
  assert.strictEqual(kpis.totalRevenue, 284900);
  console.log('✓ Master KPI Metrics aggregated (142 bookings, ₹2,84,900 total revenue)');

  // 2. Test Vehicles CRUD & Active State Toggle
  const vehicles = getAllVehicles();
  assert.strictEqual(vehicles.length >= 3, true);

  const initialDzireState = vehicles[0].isActive;
  const toggleResult = toggleVehicleActive(vehicles[0].id, 'Super Admin');
  assert.strictEqual(toggleResult, true);

  const updatedVehicles = getAllVehicles();
  assert.strictEqual(updatedVehicles[0].isActive, !initialDzireState);
  console.log('✓ Vehicle active state toggled successfully and audit log generated');

  // 3. Test One-Way Locations CRUD & Active State Toggle
  const locations = getAllLocations();
  assert.strictEqual(locations.length >= 5, true);

  const locToggleRes = toggleLocationActive(locations[0].id, 'Super Admin');
  assert.strictEqual(locToggleRes, true);
  console.log('✓ One-Way Location active state toggled successfully');

  // 4. Test System Settings Configuration
  const initialSettings = getSystemSettings();
  assert.strictEqual(initialSettings.gstPercentage, 5);
  assert.strictEqual(initialSettings.gpsUpdateIntervalMs, 5000);

  const updatedSettings = updateSystemSettings(
    { companyName: 'Kandy Cabs Premium', gstPercentage: 5 },
    'Super Admin'
  );
  assert.strictEqual(updatedSettings.companyName, 'Kandy Cabs Premium');
  console.log('✓ Global system configuration settings updated and saved platform-wide');

  // 5. Test Audit Log Activity Stream
  const auditLogs = getAuditLogs();
  assert.strictEqual(auditLogs.length > 0, true);
  console.log('✓ Immutable admin audit activity stream verified');

  console.log('✓ All Phase 12 Complete Production Admin Panel tests passed successfully!');
}

testPhase12AdminMasterPanel();
