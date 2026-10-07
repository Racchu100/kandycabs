import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../apps/web/.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

import { signAuthToken } from '../packages/shared/src/auth/jwt';
import { prisma } from '../packages/db/src/index';

async function main() {
  const driver = await prisma.driver.findFirst({
    where: { deletedAt: null },
    include: { user: true },
  });
  if (!driver) {
    console.log('No driver found in database');
    return;
  }

  const token = await signAuthToken({
    userId: driver.userId,
    role: 'DRIVER',
    phone: driver.user.phone,
  });

  const times: number[] = [];
  let bodyLength = 0;
  let parsedBody: any = null;

  for (let i = 0; i < 20; i++) {
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

  // drop first warmup runs
  const cleanTimes = times.slice(2);
  cleanTimes.sort((a, b) => a - b);
  const p50 = cleanTimes[Math.floor(cleanTimes.length * 0.5)].toFixed(2);
  const p95 = cleanTimes[Math.floor(cleanTimes.length * 0.95)].toFixed(2);
  const p99 = cleanTimes[Math.floor(cleanTimes.length * 0.99)].toFixed(2);
  const avg = (cleanTimes.reduce((a, b) => a + b, 0) / cleanTimes.length).toFixed(2);

  console.log('=== DRIVER STATUS BENCHMARK ===');
  console.log(`Payload size: ${bodyLength} bytes (${(bodyLength / 1024).toFixed(2)} KB)`);
  console.log(`P50 Latency: ${p50} ms`);
  console.log(`P95 Latency: ${p95} ms`);
  console.log(`P99 Latency: ${p99} ms`);
  console.log(`Average Latency: ${avg} ms`);
  console.log('Driver session keys returned:', Object.keys(parsedBody.driver || {}));
  console.log('Active booking attached:', !!parsedBody.activeBooking);
  console.log('Upcoming bookings count:', parsedBody.upcomingBookings?.length || 0);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
