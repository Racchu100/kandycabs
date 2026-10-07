require('dotenv').config();
const { performance } = require('perf_hooks');

async function test() {
  const t0 = performance.now();
  console.log('Sending quote request...');
  const res = await fetch('http://127.0.0.1:3000/api/pricing/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category: 'SEDAN',
      tripType: 'ONEWAY',
      fuelType: 'DIESEL',
      pickupLat: 12.9141,
      pickupLng: 74.856,
      dropLat: 12.9716,
      dropLng: 77.5946,
    }),
  });
  console.log('Status:', res.status, 'Time:', (performance.now() - t0).toFixed(1) + 'ms');
  const text = await res.text();
  console.log('Body length:', text.length, 'Snippet:', text.slice(0, 150));
}

test().catch(console.error);
