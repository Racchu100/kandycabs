import {
  calculateFare,
  isNightTimeWindow,
  VehicleCategory,
  FuelType,
  TripType,
  VEHICLE_RATES,
} from './index';

async function runPricingTests() {
  console.log('🧪 Starting Pricing Engine Unit Tests...');

  // 1. Test Night Window Logic
  console.log('1. Testing Night Window Logic...');
  const dayTime = new Date('2026-09-17T14:30:00'); // 2:30 PM
  const nightTime1 = new Date('2026-09-17T23:15:00'); // 11:15 PM
  const nightTime2 = new Date('2026-09-17T04:45:00'); // 4:45 AM

  if (isNightTimeWindow(dayTime)) throw new Error('14:30 should not be night time');
  if (!isNightTimeWindow(nightTime1)) throw new Error('23:15 should be night time');
  if (!isNightTimeWindow(nightTime2)) throw new Error('04:45 should be night time');
  console.log('   ✅ Night window tests passed');

  // 2. Test Daytime Oneway Sedan Fare
  console.log('2. Testing Daytime Oneway Sedan (100 km)...');
  const onewayQuote = calculateFare({
    category: VehicleCategory.SEDAN,
    fuelType: FuelType.DIESEL,
    tripType: TripType.ONEWAY,
    distanceKm: 100,
    scheduledAt: dayTime,
  });

  // Sedan diesel = 15/km -> baseFare = 1500, driverAllowance = 0, nightCharge = 0
  // subtotal = 1500
  // GST 5% = 75
  // totalFare = 1575
  // advance (25%) = 394 (or round(1575*0.25)=394)
  // balance = 1181
  if (onewayQuote.baseFare !== 1500) throw new Error(`Base fare mismatch: expected 1500, got ${onewayQuote.baseFare}`);
  if (onewayQuote.nightCharge !== 0) throw new Error(`Night charge should be 0, got ${onewayQuote.nightCharge}`);
  if (onewayQuote.gstAmount !== 75) throw new Error(`GST mismatch: expected 75, got ${onewayQuote.gstAmount}`);
  if (onewayQuote.totalFare !== 1575) throw new Error(`Total fare mismatch: expected 1575, got ${onewayQuote.totalFare}`);
  if (onewayQuote.advanceAmount + onewayQuote.balanceAmount !== onewayQuote.totalFare) {
    throw new Error('Advance + Balance must equal Total Fare');
  }
  console.log(`   ✅ Daytime oneway sedan: total ₹${onewayQuote.totalFare} (Adv: ₹${onewayQuote.advanceAmount}, Bal: ₹${onewayQuote.balanceAmount})`);

  // 3. Test Night-time Oneway Sedan Fare
  console.log('3. Testing Night-time Oneway Sedan (100 km at 23:15)...');
  const nightQuote = calculateFare({
    category: VehicleCategory.SEDAN,
    fuelType: FuelType.DIESEL,
    tripType: TripType.ONEWAY,
    distanceKm: 100,
    scheduledAt: nightTime1,
  });
  // subtotal = 1500 + 250 (night charge) = 1750
  // GST 5% = 87.5
  // totalFare = 1837.5
  if (nightQuote.nightCharge !== 250) throw new Error(`Night charge should be 250, got ${nightQuote.nightCharge}`);
  if (nightQuote.totalFare !== 1837.5) throw new Error(`Total fare mismatch: expected 1837.5, got ${nightQuote.totalFare}`);
  console.log(`   ✅ Night-time oneway sedan: total ₹${nightQuote.totalFare} (incl ₹${nightQuote.nightCharge} night charge)`);

  // 4. Test Round-trip min 250km/day allowance
  console.log('4. Testing Round-trip 2-day SUV trip (Actual single distance: 100 km)...');
  const roundTripQuote = calculateFare({
    category: VehicleCategory.SUV,
    fuelType: FuelType.DIESEL,
    tripType: TripType.ROUND,
    distanceKm: 100, // 200 km total < 2 days * 250 = 500 km min
    durationDays: 2,
    scheduledAt: dayTime,
  });
  // Billable km must be 500 km (250*2)
  // SUV diesel = 18/km -> baseFare = 500 * 18 = 9000
  // Driver allowance = 2 * 400 = 800
  // subtotal = 9800
  // GST = 490
  // totalFare = 10290
  if (roundTripQuote.billableDistanceKm !== 500) {
    throw new Error(`Billable km mismatch: expected 500, got ${roundTripQuote.billableDistanceKm}`);
  }
  if (roundTripQuote.driverAllowance !== 800) {
    throw new Error(`Driver allowance mismatch: expected 800, got ${roundTripQuote.driverAllowance}`);
  }
  if (roundTripQuote.totalFare !== 10290) {
    throw new Error(`Total fare mismatch: expected 10290, got ${roundTripQuote.totalFare}`);
  }
  console.log(`   ✅ Round trip 2-day SUV: 500 km billable, ₹${roundTripQuote.driverAllowance} driver allowance, total ₹${roundTripQuote.totalFare}`);

  // 5. Test Coupon Discount
  console.log('5. Testing Coupon Code (KANDY10)...');
  const couponQuote = calculateFare({
    category: VehicleCategory.SEDAN,
    fuelType: FuelType.DIESEL,
    tripType: TripType.ONEWAY,
    distanceKm: 100,
    scheduledAt: dayTime,
    couponCode: 'KANDY10',
  });
  // Subtotal before coupon = 1500, discount = 150 -> subtotal = 1350
  // GST = 67.5, total = 1417.5
  if (couponQuote.discount !== 150) throw new Error(`Discount mismatch: expected 150, got ${couponQuote.discount}`);
  if (couponQuote.totalFare !== 1417.5) throw new Error(`Total fare mismatch: expected 1417.5, got ${couponQuote.totalFare}`);
  console.log(`   ✅ Coupon discount applied: -₹${couponQuote.discount}, final total: ₹${couponQuote.totalFare}`);

  console.log('🎉 All Pricing Engine tests passed successfully!');
}

runPricingTests().catch((e) => {
  console.error('❌ Pricing tests failed:', e);
  process.exit(1);
});
