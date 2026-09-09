import assert from 'node:assert';
import {
  getAdminStats,
  getAdminBookings,
  assignDriverToBooking,
  getAuditLogs,
} from '../src/lib/adminEngine';

function testPhase9AdminOperationalEngine() {
  console.log('Testing Phase 9 Admin Dispatch & System Operations Console...');

  // 1. Test KPI Stats Query
  const stats = getAdminStats();
  assert.strictEqual(stats.totalBookings > 0, true);
  assert.strictEqual(typeof stats.totalRevenue, 'number');
  console.log(`✓ Admin KPI summary query verified (${stats.totalBookings} total bookings, ₹${stats.totalRevenue} total revenue)`);

  // 2. Test Booking Overview Query
  const bookings = getAdminBookings();
  assert.strictEqual(bookings.length > 0, true);
  const unassigned = bookings.find((b) => b.status === 'WAITING_FOR_DRIVER');
  assert.strictEqual(!!unassigned, true);
  console.log(`✓ Admin Dispatch queue query verified (Unassigned booking found: ${unassigned?.bookingReference})`);

  // 3. Test Manual Driver Assignment & Dispatch
  const bookingRef = unassigned?.bookingReference || 'KC-99011';
  const dispatchRes = assignDriverToBooking(
    bookingRef,
    'drv_suresh',
    'Suresh Gowda',
    'KA 19 C 4829',
    'admin_super',
    'Super Admin'
  );

  assert.strictEqual(dispatchRes.success, true);
  assert.strictEqual(dispatchRes.booking?.status, 'DRIVER_ASSIGNED');
  assert.strictEqual(dispatchRes.booking?.assignedDriverName, 'Suresh Gowda');
  console.log(`✓ Manual Chauffeur Dispatch verified (Assigned Suresh Gowda KA 19 C 4829 to ${bookingRef})`);

  // 4. Test Audit Logging Stream Recording
  const logs = getAuditLogs();
  assert.strictEqual(logs.length > 0, true);
  const latestLog = logs[0];
  assert.strictEqual(latestLog.action, 'ASSIGN_DRIVER');
  assert.strictEqual(latestLog.targetId, bookingRef);
  console.log(`✓ Audit Log activity stream verified (Recorded ${latestLog.action} for ${latestLog.targetId})`);

  console.log('✓ All Phase 9 Admin Dispatch & System Console tests passed successfully!');
}

testPhase9AdminOperationalEngine();
