require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { SignJWT } = require('jose');

let dbUrl = process.env.DATABASE_URL;
if (dbUrl && !dbUrl.includes('connection_limit')) {
  const separator = dbUrl.includes('?') ? '&' : '?';
  dbUrl = `${dbUrl}${separator}connection_limit=5&pool_timeout=30`;
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});

async function main() {
  const driver = await prisma.driver.findFirst({
    where: { deletedAt: null },
    include: { user: true },
  });
  if (!driver) {
    console.log('No driver found');
    return;
  }

  const secret = new TextEncoder().encode(
    process.env.JWT_SECRET || 'kandy-cabs-super-secret-jwt-key-change-in-production-min-32-chars-long!'
  );
  const token = await new SignJWT({
    userId: driver.userId,
    role: 'DRIVER',
    phone: driver.user.phone,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);

  console.log('Generated token for driver:', driver.user.phone);

  const times = [];
  let bodyLength = 0;
  let parsedBody = null;

  for (let i = 0; i < 10; i++) {
    const start = performance.now();
    const res = await fetch('http://localhost:3000/api/driver/status', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const text = await res.text();
    const duration = performance.now() - start;
    times.push(duration);
    bodyLength = Buffer.byteLength(text, 'utf8');
    try {
      parsedBody = JSON.parse(text);
    } catch (e) {}
  }

  // drop first 2 warmup runs
  const cleanTimes = times.slice(2);
  cleanTimes.sort((a, b) => a - b);
  const p50 = cleanTimes[Math.floor(cleanTimes.length * 0.5)].toFixed(2);
  const p95 = cleanTimes[Math.floor(cleanTimes.length * 0.95)].toFixed(2);
  const p99 = cleanTimes[Math.floor(cleanTimes.length * 0.99)].toFixed(2);
  const avg = (cleanTimes.reduce((a, b) => a + b, 0) / cleanTimes.length).toFixed(2);

  console.log('====================================');
  console.log('DRIVER STATUS BENCHMARK RESULTS');
  console.log('====================================');
  console.log(`Payload Size: ${bodyLength} bytes (${(bodyLength / 1024).toFixed(2)} KB)`);
  console.log(`P50 Latency: ${p50} ms`);
  console.log(`P95 Latency: ${p95} ms`);
  console.log(`P99 Latency: ${p99} ms`);
  console.log(`Average Latency: ${avg} ms`);
  console.log('Driver Fields:', Object.keys(parsedBody?.driver || {}));
  console.log('Has VehiclePhotos:', 'vehiclePhotos' in (parsedBody?.driver || {}));
  console.log('Active Booking ID:', parsedBody?.activeBooking?.id || 'None');
  console.log('Upcoming Bookings Count:', parsedBody?.upcomingBookings?.length || 0);
  console.log('====================================');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
