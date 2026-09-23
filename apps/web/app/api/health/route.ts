import { NextResponse } from 'next/server';
import { prisma } from '@kandy-cabs/db';

export const dynamic = 'force-dynamic';

const startTime = Date.now();

export async function GET() {
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const dbLatencyMs = Date.now() - dbStart;

    return NextResponse.json(
      {
        status: 'ok',
        service: 'kandycabs-web-api',
        database: 'connected',
        dbLatencyMs,
        uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Database health check failed:', error);
    return NextResponse.json(
      {
        status: 'db_unreachable',
        service: 'kandycabs-web-api',
        error: error.message || 'Database connection error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
