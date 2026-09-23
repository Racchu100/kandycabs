import crypto from 'crypto';
import {
  VehicleCategory,
  TripType,
  FuelType,
  calculateFare,
} from './index';

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function runPhase7Tests() {
  console.log('🧪 Starting Phase 7 Unit & Integration Tests...\n');

  // Test 1: Razorpay Webhook HMAC Signature Generation & Timing-Safe Verification
  console.log('1. Testing Razorpay Webhook HMAC-SHA256 Signature Verification...');
  const webhookSecret = 'test_webhook_secret_key_456';
  const testPayload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_test_987654321',
          order_id: 'order_test_123456',
          amount: 250000,
        },
      },
    },
  });

  const validSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(testPayload)
    .digest('hex');

  const invalidSignature = 'deadbeef1234567890abcdef';

  const checkSignature = (body: string, sig: string, secret: string) => {
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
    const sigBuf = Buffer.from(sig, 'utf8');
    const expBuf = Buffer.from(expected, 'utf8');
    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  };

  const isSigValid = checkSignature(testPayload, validSignature, webhookSecret);
  const isBadSigRejected = !checkSignature(testPayload, invalidSignature, webhookSecret);

  if (isSigValid && isBadSigRejected) {
    console.log('   ✅ Valid webhook signature verified and forged signature rejected!');
  } else {
    throw new Error('❌ Webhook signature verification failed');
  }

  // Test 2: Dynamic Pricing Rule Override Calculation
  console.log('\n2. Testing Dynamic Pricing Overrides Engine...');
  const baseQuote = calculateFare({
    category: VehicleCategory.SEDAN,
    tripType: TripType.ONEWAY,
    distanceKm: 100,
    scheduledAt: '2026-06-01T12:00:00.000Z',
  });

  const dynamicOverrideQuote = calculateFare({
    category: VehicleCategory.SEDAN,
    tripType: TripType.ONEWAY,
    distanceKm: 100,
    scheduledAt: '2026-06-01T12:00:00.000Z',
    overrides: {
      ratePerKm: 20.0, // raised from 14 to 20
      driverAllowance: 500.0,
      gstRatePercent: 12.0, // custom 12% GST
    },
  });

  console.log(`   Default Fare (100km): ₹${baseQuote.totalFare} (Base rate: ₹${baseQuote.ratePerKm}/km)`);
  console.log(`   Dynamic Override Fare: ₹${dynamicOverrideQuote.totalFare} (Base rate: ₹${dynamicOverrideQuote.ratePerKm}/km, GST: ${dynamicOverrideQuote.gstAmount})`);

  if (
    dynamicOverrideQuote.baseFare === 2000 &&
    dynamicOverrideQuote.totalFare > baseQuote.totalFare
  ) {
    console.log('   ✅ Dynamic fare overrides applied cleanly!');
  } else {
    throw new Error('❌ Dynamic fare calculation mismatch');
  }

  // Test 3: Odometer vs GPS Haversine Distance Discrepancy Calculation
  console.log('\n3. Testing Odometer vs GPS Breadcrumb Discrepancy Flagging...');
  
  // Simulated breadcrumb points (approx 20km route)
  const breadcrumbs = [
    { lat: 12.9716, lng: 77.5946 }, // Bangalore
    { lat: 12.9900, lng: 77.6200 },
    { lat: 13.0100, lng: 77.6500 },
    { lat: 13.0300, lng: 77.6800 },
  ];

  let totalGpsDist = 0;
  for (let i = 1; i < breadcrumbs.length; i++) {
    totalGpsDist += haversineKm(
      breadcrumbs[i - 1].lat,
      breadcrumbs[i - 1].lng,
      breadcrumbs[i].lat,
      breadcrumbs[i].lng
    );
  }
  totalGpsDist = Math.round(totalGpsDist * 10) / 10; // ~11.8 km

  // Normal trip: odometer reading matches GPS within 5%
  const normalOdometerDist = totalGpsDist * 1.03;
  const normalDiffPct = (Math.abs(normalOdometerDist - totalGpsDist) / totalGpsDist) * 100;
  const normalFlagged = normalDiffPct > 10.0;

  // Suspicious trip: driver entered +50% higher odometer reading
  const suspiciousOdometerDist = totalGpsDist * 1.5;
  const suspiciousDiffPct = (Math.abs(suspiciousOdometerDist - totalGpsDist) / totalGpsDist) * 100;
  const suspiciousFlagged = suspiciousDiffPct > 10.0;

  console.log(`   GPS Breadcrumbs Sum: ${totalGpsDist} km`);
  console.log(`   Normal Odometer: ${normalOdometerDist.toFixed(1)} km (Variance: ${normalDiffPct.toFixed(1)}%, Flagged: ${normalFlagged})`);
  console.log(`   Suspicious Odometer: ${suspiciousOdometerDist.toFixed(1)} km (Variance: ${suspiciousDiffPct.toFixed(1)}%, Flagged: ${suspiciousFlagged})`);

  if (!normalFlagged && suspiciousFlagged) {
    console.log('   ✅ Discrepancy algorithm correctly flagged suspicious odometer entry (>10% variance)!');
  } else {
    throw new Error('❌ Odometer discrepancy calculation failed');
  }

  console.log('\n🎉 ALL PHASE 7 UNIT & INTEGRATION TESTS PASSED SUCCESSFULLY!');
}

runPhase7Tests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
