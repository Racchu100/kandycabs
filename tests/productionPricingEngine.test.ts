import assert from 'node:assert';
import {
  calculateProductionFare,
  freezeFareSnapshot,
  formatINR,
} from '../src/lib/productionPricingEngine';
import { updateAdminPricingRule } from '../src/lib/pricingConfigStore';

function testProductionPricingEnginePhase4() {
  console.log('Testing Phase 4 Production Pricing Engine & Fare Snapshots...');

  // 1. Test Minimum KM Enforcement Rule
  // Distance is 20 km, but Sedan minKm is 50 km. 50 km * ₹14/km = ₹700 distance fare.
  const snapshotMinKm = calculateProductionFare({
    distanceKm: 20,
    vehicleCategory: 'sedan',
    tripMode: 'ONEWAY',
  });

  assert.strictEqual(snapshotMinKm.minimum_km, 50);
  assert.strictEqual(snapshotMinKm.distance_fare, 700);
  console.log('✓ Minimum KM enforcement verified (20 km calculated as 50 km min baseline)');

  // 2. Test Different Vehicle Category Rates
  const snapshotInnova = calculateProductionFare({
    distanceKm: 100,
    vehicleCategory: 'innova',
    tripMode: 'ONEWAY',
  });

  assert.strictEqual(snapshotInnova.rate_used, 23);
  assert.strictEqual(snapshotInnova.distance_fare, 2300);
  console.log('✓ Vehicle category dynamic rate card verified (Innova rate ₹23/km)');

  // 3. Test GST Calculation & Coupon Discount
  const snapshotCoupon = calculateProductionFare({
    distanceKm: 100,
    vehicleCategory: 'sedan',
    tripMode: 'ONEWAY',
    couponDiscount: 200,
  });

  // Distance 100km * ₹14 = ₹1400 + ₹400 driver allowance = ₹1800 subtotal
  // Subtotal ₹1800 - ₹200 coupon = ₹1600 taxable
  // 5% GST on ₹1600 = ₹80 GST
  // Final = ₹1680
  assert.strictEqual(snapshotCoupon.coupon_discount, 200);
  assert.strictEqual(snapshotCoupon.gst_amount, 80);
  assert.strictEqual(snapshotCoupon.final_amount, 1680);
  console.log('✓ GST & coupon discount application verified (₹1800 subtotal - ₹200 = ₹1680 final)');

  // 4. Test Toll Exclusion Policy
  assert.strictEqual(snapshotCoupon.toll_status, 'EXTRA_PAYABLE_SEPARATELY');
  assert.strictEqual(
    snapshotCoupon.toll_notice.includes('Toll charges are extra and payable separately.'),
    true
  );
  console.log('✓ Toll exclusion notice & status verified');

  // 5. Test INR Formatting
  const formatted = formatINR(1680);
  assert.strictEqual(formatted.includes('1,680'), true);
  console.log(`✓ INR currency formatting verified: ${formatted}`);

  // 6. Test Immutable Historical Fare Snapshot
  // Freeze snapshot for booking bk_historical_99
  const frozenSnapshot = freezeFareSnapshot('bk_historical_99', {
    distanceKm: 100,
    vehicleCategory: 'sedan',
    tripMode: 'ONEWAY',
  });

  const originalFinalAmount = frozenSnapshot.final_amount; // ₹1890

  // Admin subsequently doubles the rate from ₹14 to ₹28 in config store
  updateAdminPricingRule({
    id: 'pr_sedan_oneway',
    vehicleCategory: 'sedan',
    tripMode: 'ONEWAY',
    ratePerKm: 28, // Doubled rate!
    minKm: 50,
    minFare: 1400,
    driverAllowancePerDay: 400,
    driverNightAllowance: 250,
    airportSurcharge: 0,
    gstRatePercent: 5,
    waitingChargePerHour: 150,
    advancePaymentPercent: 25,
    tollInclusive: false,
  });

  // Calculate new booking fare after rate change
  const newBookingSnapshot = calculateProductionFare({
    distanceKm: 100,
    vehicleCategory: 'sedan',
    tripMode: 'ONEWAY',
  });

  // New fare should be higher due to rate change
  assert.strictEqual(newBookingSnapshot.rate_used, 28);

  // Historical frozen snapshot MUST REMAIN UNCHANGED
  assert.strictEqual(frozenSnapshot.rate_used, 14);
  assert.strictEqual(frozenSnapshot.final_amount, originalFinalAmount);
  console.log('✓ Immutable Historical Fare Snapshot verified (Admin rate change does NOT alter past booking snapshot)');

  console.log('✓ All Phase 4 Pricing Engine tests passed successfully!');
}

testProductionPricingEnginePhase4();
