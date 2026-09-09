import assert from 'node:assert';
import { calculateFare } from '../src/lib/pricingEngine';

function testPricingEngine() {
  console.log('Testing Pricing Engine...');

  const breakdownSedan = calculateFare({
    distanceKm: 100,
    vehicleCategory: 'sedan',
    tripMode: 'oneway',
  });

  assert.strictEqual(breakdownSedan.ratePerKm, 14);
  assert.strictEqual(breakdownSedan.distanceFare, 1400);
  assert.strictEqual(breakdownSedan.driverAllowance, 400);
  assert.strictEqual(breakdownSedan.nightAllowance, 0);
  assert.strictEqual(breakdownSedan.subtotal, 1800);
  assert.strictEqual(breakdownSedan.gstAmount, 90);
  assert.strictEqual(breakdownSedan.totalFare, 1890);

  const breakdownInnova = calculateFare({
    distanceKm: 200,
    vehicleCategory: 'innova',
    tripMode: 'round',
    isNightJourney: true,
  });

  assert.strictEqual(breakdownInnova.ratePerKm, 23);
  assert.strictEqual(breakdownInnova.distanceFare, 4600);
  assert.strictEqual(breakdownInnova.nightAllowance, 250);

  console.log('✓ Pricing Engine tests passed successfully!');
}

testPricingEngine();
