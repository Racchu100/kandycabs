require('dotenv').config();
const { SignJWT } = require('jose');
const { performance } = require('perf_hooks');

async function sign(payload) {
  const key = new TextEncoder().encode(process.env.JWT_SECRET);
  return await new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).sign(key);
}

async function run() {
  const adminToken = await sign({ userId: 'cmu5nmiy40005117sa2zh45ld', phone: '+919999999999', roles: ['ADMIN', 'CUSTOMER'] });
  const driverToken = await sign({ userId: 'cmub8qlw50003lv5g58ojcuoq', phone: '+919854632158', roles: ['DRIVER'] });
  const customerToken = await sign({ userId: 'cmu5nmk6f0009117sjs4c2d1u', phone: '+917777777777', roles: ['CUSTOMER'] });

  const tests = [
    { name: 'Customer Booking List', url: 'http://127.0.0.1:3000/api/customer/bookings/list', opts: { headers: { Authorization: `Bearer ${customerToken}` } } },
    { name: 'Driver Duty Status', url: 'http://127.0.0.1:3000/api/driver/status', opts: { headers: { Authorization: `Bearer ${driverToken}` } } },
    { name: 'Fare Quote', url: 'http://127.0.0.1:3000/api/pricing/quote', opts: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category: 'SEDAN', tripType: 'ONEWAY', fuelType: 'DIESEL', pickupLat: 12.9141, pickupLng: 74.856, dropLat: 12.9716, dropLng: 77.5946 }) } },
    { name: 'Admin Bookings', url: 'http://127.0.0.1:3001/api/admin/bookings', opts: { headers: { Authorization: `Bearer ${adminToken}` } } },
    { name: 'Admin Pricing', url: 'http://127.0.0.1:3001/api/admin/pricing', opts: { headers: { Authorization: `Bearer ${adminToken}` } } },
    { name: 'Admin Fleets', url: 'http://127.0.0.1:3001/api/admin/fleets', opts: { headers: { Authorization: `Bearer ${adminToken}` } } },
  ];

  for (const t of tests) {
    const t0 = performance.now();
    try {
      const res = await fetch(t.url, t.opts);
      const time = (performance.now() - t0).toFixed(1);
      console.log(`[${t.name}] Status: ${res.status} in ${time}ms`);
    } catch (e) {
      console.log(`[${t.name}] FAILED: ${e.message}`);
    }
  }
}

run();
