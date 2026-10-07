import 'dotenv/config';
import { performance } from 'perf_hooks';
import { SignJWT } from 'jose';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const WEB_BASE = 'http://127.0.0.1:3000';
const ADMIN_BASE = 'http://127.0.0.1:3001';
const JWT_SECRET = process.env.JWT_SECRET || 'development-jwt-secret-key-32charslong';

function stats(latencies) {
  if (latencies.length === 0) return { min: 0, avg: 0, p50: 0, p95: 0, p99: 0, max: 0, count: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const avg = sum / sorted.length;
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  return {
    min: Math.round(sorted[0] * 10) / 10,
    avg: Math.round(avg * 10) / 10,
    p50: Math.round(p50 * 10) / 10,
    p95: Math.round(p95 * 10) / 10,
    p99: Math.round(p99 * 10) / 10,
    max: Math.round(sorted[sorted.length - 1] * 10) / 10,
    count: sorted.length,
  };
}

async function signToken(payload) {
  const key = new TextEncoder().encode(JWT_SECRET);
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(key);
}

async function createTokens() {
  const adminUser = await prisma.user.findFirst({
    where: { roles: { has: 'ADMIN' } },
  });
  const driverUser = await prisma.user.findFirst({
    where: { roles: { has: 'DRIVER' }, driver: { isNot: null } },
    include: { driver: true },
  });
  const customerUser = await prisma.user.findFirst({
    where: { roles: { has: 'CUSTOMER' }, customer: { isNot: null } },
    include: { customer: true },
  });

  const adminToken = adminUser
    ? await signToken({ userId: adminUser.id, phone: adminUser.phone, roles: adminUser.roles })
    : '';

  const driverToken = driverUser
    ? await signToken({ userId: driverUser.id, phone: driverUser.phone, roles: driverUser.roles })
    : '';

  const customerToken = customerUser
    ? await signToken({ userId: customerUser.id, phone: customerUser.phone, roles: customerUser.roles })
    : '';

  return { adminUser, driverUser, customerUser, adminToken, driverToken, customerToken };
}

async function request(url, options = {}, timeoutMs = 8000) {
  const t0 = performance.now();
  let status = 0;
  let size = 0;
  let error = null;
  let data = null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    status = res.status;
    const text = await res.text();
    size = text.length;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    if (!res.ok && res.status >= 500) {
      error = `HTTP ${res.status}`;
    }
  } catch (err) {
    error = err.name === 'AbortError' ? 'TIMEOUT' : err.message;
  }
  const latency = performance.now() - t0;
  return { status, latency, size, error, data };
}

async function runConcurrent(fn, concurrency, count) {
  const results = [];
  let index = 0;
  const workers = Array(concurrency).fill(0).map(async () => {
    while (index < count) {
      const cur = index++;
      const res = await fn(cur);
      results.push(res);
    }
  });
  await Promise.all(workers);
  return results;
}

async function main() {
  console.log('====================================================');
  console.log('🚀 STARTING KANDY CABS LOAD & PERFORMANCE TEST SUITE');
  console.log('====================================================\n');

  const { adminUser, driverUser, customerUser, adminToken, driverToken, customerToken } = await createTokens();
  console.log(`Test Environment:`);
  console.log(`- Admin Base: ${ADMIN_BASE} (User: ${adminUser?.phone || 'none'})`);
  console.log(`- Web Base: ${WEB_BASE} (Customer: ${customerUser?.phone || 'none'}, Driver: ${driverUser?.phone || 'none'})\n`);

  const customerHeaders = { Authorization: `Bearer ${customerToken}`, 'Content-Type': 'application/json' };
  const driverHeaders = { Authorization: `Bearer ${driverToken}`, 'Content-Type': 'application/json' };
  const adminHeaders = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' };

  // ==========================================
  // SECTION 1: BASELINE TESTS
  // ==========================================
  console.log('--- 1. BASELINE TESTS (Individual API benchmarks, 10 runs each) ---');
  const endpoints = [
    { name: 'Customer Booking List', url: `${WEB_BASE}/api/customer/bookings/list`, opts: { headers: customerHeaders } },
    {
      name: 'Fare Quote (OSRM+Rates)',
      url: `${WEB_BASE}/api/pricing/quote`,
      opts: {
        method: 'POST',
        headers: customerHeaders,
        body: JSON.stringify({
          category: 'SEDAN',
          tripType: 'ONEWAY',
          fuelType: 'DIESEL',
          pickupLat: 12.9141,
          pickupLng: 74.856,
          dropLat: 12.9716,
          dropLng: 77.5946,
        }),
      },
    },
    { name: 'Driver Duty Status', url: `${WEB_BASE}/api/driver/status`, opts: { headers: driverHeaders } },
    { name: 'Admin Bookings List', url: `${ADMIN_BASE}/api/admin/bookings`, opts: { headers: adminHeaders } },
    { name: 'Admin Pricing Rules', url: `${ADMIN_BASE}/api/admin/pricing`, opts: { headers: adminHeaders } },
    { name: 'Admin Fleet Categories', url: `${ADMIN_BASE}/api/admin/fleets`, opts: { headers: adminHeaders } },
  ];

  const baselineResults = {};
  for (const ep of endpoints) {
    const latencies = [];
    let errCount = 0;
    let totalSize = 0;
    for (let i = 0; i < 10; i++) {
      const res = await request(ep.url, ep.opts);
      if (res.error || res.status >= 400) errCount++;
      latencies.push(res.latency);
      totalSize += res.size;
    }
    const st = stats(latencies);
    baselineResults[ep.name] = { ...st, errors: errCount, avgSize: Math.round(totalSize / 10) };
    console.log(`[Baseline] ${ep.name.padEnd(25)}: P50=${st.p50}ms | P95=${st.p95}ms | P99=${st.p99}ms | AvgSize=${Math.round(totalSize / 10)}B | Errors=${errCount}`);
  }

  // ==========================================
  // SECTION 2: CUSTOMER CONCURRENCY TEST
  // ==========================================
  console.log('\n--- 2. CUSTOMER CONCURRENCY TEST (10, 25, 50 Users) ---');
  const customerConcurrencyLevels = [10, 25, 50];
  const customerResults = {};

  for (const lvl of customerConcurrencyLevels) {
    const latencies = [];
    let errCount = 0;
    const count = lvl * 2;
    const results = await runConcurrent(async (i) => {
      if (i % 2 === 0) {
        return await request(`${WEB_BASE}/api/customer/bookings/list`, { headers: customerHeaders });
      } else {
        return await request(`${WEB_BASE}/api/pricing/quote`, {
          method: 'POST',
          headers: customerHeaders,
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
      }
    }, lvl, count);

    for (const r of results) {
      latencies.push(r.latency);
      if (r.error || r.status >= 400) errCount++;
    }
    const st = stats(latencies);
    customerResults[lvl] = { ...st, errors: errCount, requests: count };
    console.log(`[Customer Load] Level ${lvl} (${count} reqs, C=${lvl}): P50=${st.p50}ms | P95=${st.p95}ms | P99=${st.p99}ms | Errors=${errCount}`);
  }

  // ==========================================
  // SECTION 3: BOOKING CONCURRENCY & INTEGRITY TEST
  // ==========================================
  console.log('\n--- 3. BOOKING CONCURRENCY & DATA INTEGRITY TEST (5, 10, 25 Simultaneous) ---');
  const bookingLevels = [5, 10, 25];
  const bookingResults = {};
  const createdBookingIds = [];

  for (const lvl of bookingLevels) {
    const latencies = [];
    let errCount = 0;
    const bookingRefs = new Set();
    const results = await runConcurrent(async (i) => {
      const scheduledDate = new Date(Date.now() + (24 + i) * 3600 * 1000).toISOString();
      const res = await request(`${WEB_BASE}/api/customer/bookings`, {
        method: 'POST',
        headers: customerHeaders,
        body: JSON.stringify({
          tripType: 'ONEWAY',
          category: 'SEDAN',
          fuelType: 'DIESEL',
          pickupAddress: `Test Pickup Point ${i}, Mangaluru`,
          pickupLat: 12.9141 + i * 0.001,
          pickupLng: 74.856 + i * 0.001,
          dropAddress: `Test Drop Point ${i}, Bengaluru`,
          dropLat: 12.9716,
          dropLng: 77.5946,
          scheduledAt: scheduledDate,
          paymentMode: 'PAY_ON_DROP',
          passengerName: 'Test Load User',
          notes: `Load test booking batch C=${lvl}`,
        }),
      });
      return res;
    }, lvl, lvl);

    for (const r of results) {
      latencies.push(r.latency);
      if (r.error || r.status >= 400 || !r.data?.success) {
        errCount++;
      } else if (r.data?.booking) {
        const b = r.data.booking;
        createdBookingIds.push(b.id);
        if (bookingRefs.has(b.humanReadableRef)) {
          console.error(`🚨 DUPLICATE REF DETECTED: ${b.humanReadableRef}`);
        }
        bookingRefs.add(b.humanReadableRef);
      }
    }
    const st = stats(latencies);
    bookingResults[lvl] = { ...st, errors: errCount, requests: lvl, uniqueRefs: bookingRefs.size };
    console.log(`[Booking Load] C=${lvl} Simultaneous: P50=${st.p50}ms | P95=${st.p95}ms | P99=${st.p99}ms | UniqueRefs=${bookingRefs.size}/${lvl} | Errors=${errCount}`);
  }

  // ==========================================
  // SECTION 4: DRIVER GPS TELEMETRY LOAD TEST
  // ==========================================
  console.log('\n--- 4. DRIVER GPS LOAD TEST (10, 25, 50, 100 Simulated Drivers) ---');
  const gpsLevels = [10, 25, 50, 100];
  const gpsResults = {};

  const activeBooking = await prisma.booking.findFirst({
    where: { assignedDriverId: driverUser?.driver?.id, status: { in: ['DRIVER_ACCEPTED', 'DRIVER_EN_ROUTE', 'TRIP_STARTED'] } },
  });

  const targetBookingId = activeBooking ? activeBooking.id : createdBookingIds[0] || null;

  let totalDriverUpdates = 0;
  let totalTripTrackingInserts = 0;

  for (const lvl of gpsLevels) {
    const latencies = [];
    let errCount = 0;
    const count = lvl * 2;

    const initialTrackingCount = await prisma.tripTracking.count({ where: { driverId: driverUser?.driver?.id } });

    const results = await runConcurrent(async (i) => {
      const isMoving = i % 2 === 0;
      const delta = isMoving ? 0.0005 * (i + 1) : 0;
      return await request(`${WEB_BASE}/api/driver/location`, {
        method: 'POST',
        headers: driverHeaders,
        body: JSON.stringify({
          lat: 12.9141 + delta,
          lng: 74.856 + delta,
          bookingId: targetBookingId,
          timestamp: Date.now() + i * 10,
        }),
      });
    }, Math.min(lvl, 25), count);

    const finalTrackingCount = await prisma.tripTracking.count({ where: { driverId: driverUser?.driver?.id } });
    const insertedInBatch = finalTrackingCount - initialTrackingCount;

    for (const r of results) {
      latencies.push(r.latency);
      if (r.error || r.status >= 400 || !r.data?.success) errCount++;
      else totalDriverUpdates++;
    }

    totalTripTrackingInserts += insertedInBatch;

    const st = stats(latencies);
    gpsResults[lvl] = {
      ...st,
      errors: errCount,
      requests: count,
      trackingInserts: insertedInBatch,
    };
    console.log(`[GPS Load] C=${lvl} Drivers (${count} pings): P50=${st.p50}ms | P95=${st.p95}ms | P99=${st.p99}ms | Tracking Inserts=${insertedInBatch} | Errors=${errCount}`);
  }

  // ==========================================
  // SECTION 5: ADMIN CONCURRENCY TEST
  // ==========================================
  console.log('\n--- 5. ADMIN CONCURRENCY TEST (5, 10, 25 Admins) ---');
  const adminLevels = [5, 10, 25];
  const adminResults = {};

  for (const lvl of adminLevels) {
    const latencies = [];
    let errCount = 0;
    const count = lvl * 2;
    const results = await runConcurrent(async (i) => {
      if (i % 3 === 0) {
        return await request(`${ADMIN_BASE}/api/admin/bookings`, { headers: adminHeaders });
      } else if (i % 3 === 1) {
        return await request(`${ADMIN_BASE}/api/admin/pricing`, { headers: adminHeaders });
      } else {
        return await request(`${ADMIN_BASE}/api/admin/fleets`, { headers: adminHeaders });
      }
    }, lvl, count);

    for (const r of results) {
      latencies.push(r.latency);
      if (r.error || r.status >= 400) errCount++;
    }
    const st = stats(latencies);
    adminResults[lvl] = { ...st, errors: errCount, requests: count };
    console.log(`[Admin Load] C=${lvl} Admins (${count} reqs): P50=${st.p50}ms | P95=${st.p95}ms | P99=${st.p99}ms | Errors=${errCount}`);
  }

  // ==========================================
  // SECTION 6: OSRM + NOMINATIM CACHE & COALESCING TEST
  // ==========================================
  console.log('\n--- 6. OSRM + NOMINATIM CACHE & IN-FLIGHT COALESCING TEST ---');

  // Test 1: 10 concurrent identical route quote requests
  const tStartCoalesce = performance.now();
  const identicalRoutePromises = Array(10).fill(0).map(() =>
    request(`${WEB_BASE}/api/pricing/quote`, {
      method: 'POST',
      headers: customerHeaders,
      body: JSON.stringify({
        category: 'SUV',
        tripType: 'ROUND',
        fuelType: 'DIESEL',
        pickupLat: 12.8700,
        pickupLng: 74.8800,
        dropLat: 13.34088,
        dropLng: 74.74214,
      }),
    })
  );
  const coalesceResponses = await Promise.all(identicalRoutePromises);
  const totalCoalesceTime = performance.now() - tStartCoalesce;
  const coalesceLatencies = coalesceResponses.map((r) => r.latency);
  const coalesceStats = stats(coalesceLatencies);

  // Test 2: Repeat exact same request immediately -> pure cache hit
  const repeatReq = await request(`${WEB_BASE}/api/pricing/quote`, {
    method: 'POST',
    headers: customerHeaders,
    body: JSON.stringify({
      category: 'SUV',
      tripType: 'ROUND',
      fuelType: 'DIESEL',
      pickupLat: 12.8700,
      pickupLng: 74.8800,
      dropLat: 13.34088,
      dropLng: 74.74214,
    }),
  });

  console.log(`[OSRM Test] 10 Concurrent Identical Requests: All Finished in ${Math.round(totalCoalesceTime)}ms (P50=${coalesceStats.p50}ms, P95=${coalesceStats.p95}ms)`);
  console.log(`[OSRM Test] Repeated Cache Hit Latency: ${Math.round(repeatReq.latency * 10) / 10}ms (Status: ${repeatReq.status})`);

  // Test 3: Multiple distinct routes
  const distinctRoutes = [
    { pLat: 12.9141, pLng: 74.8560, dLat: 12.9716, dLng: 77.5946 },
    { pLat: 12.9141, pLng: 74.8560, dLat: 13.3408, dLng: 74.7421 },
    { pLat: 12.9141, pLng: 74.8560, dLat: 12.5000, dLng: 75.0000 },
    { pLat: 12.9141, pLng: 74.8560, dLat: 14.0000, dLng: 74.5000 },
  ];
  const distinctLatencies = [];
  for (const r of distinctRoutes) {
    const res = await request(`${WEB_BASE}/api/pricing/quote`, {
      method: 'POST',
      headers: customerHeaders,
      body: JSON.stringify({
        category: 'HATCHBACK',
        tripType: 'ONEWAY',
        fuelType: 'PETROL',
        pickupLat: r.pLat,
        pickupLng: r.pLng,
        dropLat: r.dLat,
        dropLng: r.dLng,
      }),
    });
    distinctLatencies.push(res.latency);
  }
  const distinctStats = stats(distinctLatencies);
  console.log(`[OSRM Test] Distinct Routes (4 different pairs): Avg=${distinctStats.avg}ms | P50=${distinctStats.p50}ms | P95=${distinctStats.p95}ms`);

  // ==========================================
  // SECTION 7: CLEANUP OF TEMPORARY TEST DATA
  // ==========================================
  console.log('\n--- 7. CLEANUP OF ISOLATED TEST DATA ---');
  if (createdBookingIds.length > 0) {
    await prisma.tripEvent.deleteMany({ where: { bookingId: { in: createdBookingIds } } });
    await prisma.payment.deleteMany({ where: { bookingId: { in: createdBookingIds } } });
    const delRes = await prisma.booking.deleteMany({
      where: { id: { in: createdBookingIds } },
    });
    console.log(`[Cleanup] Safely deleted ${delRes.count} temporary test booking records created during concurrency benchmark.`);
  }

  // Output structured JSON summary
  console.log('\n====================================================');
  console.log('📊 FINAL TEST RESULTS SUMMARY JSON');
  console.log('====================================================');
  const finalSummary = {
    baseline: baselineResults,
    customer: customerResults,
    booking: bookingResults,
    gps: gpsResults,
    admin: adminResults,
    osrmCoalescing: {
      concurrentCount: 10,
      totalDurationMs: Math.round(totalCoalesceTime),
      stats: coalesceStats,
      cacheHitLatencyMs: Math.round(repeatReq.latency * 10) / 10,
    },
    gpsWrites: {
      totalDriverUpdates,
      totalTripTrackingInserts,
    },
  };
  console.log(JSON.stringify(finalSummary, null, 2));

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Fatal test error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
