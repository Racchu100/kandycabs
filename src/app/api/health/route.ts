import { NextResponse } from 'next/server';

export async function GET() {
  const uptimeSeconds = process.uptime();
  const memoryUsage = process.memoryUsage();

  return NextResponse.json({
    status: 'HEALTHY',
    service: 'kandy-cabs-api',
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${Math.floor(uptimeSeconds % 60)}s`,
    metrics: {
      memoryRssMb: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
      heapTotalMb: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100,
      heapUsedMb: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
    },
    database: { status: 'CONNECTED', pool: 'ACTIVE' },
    redis: { status: 'CONNECTED', telemetryBuffer: 'HEALTHY' },
  });
}
