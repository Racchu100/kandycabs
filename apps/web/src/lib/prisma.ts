import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  isDbAvailable: boolean | undefined;
  lastDbCheck: number | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

if (globalForPrisma.isDbAvailable === undefined) {
  globalForPrisma.isDbAvailable = true;
  globalForPrisma.lastDbCheck = 0;
}

/**
 * Executes a database query wrapped with a fast timeout and circuit-breaker.
 * Prevents TCP socket hangs when PostgreSQL is unreachable or lagging.
 */
export async function safeDbQuery<T>(queryFn: () => Promise<T>, timeoutMs = 400): Promise<T | null> {
  const now = Date.now();
  // If DB was recently marked offline, skip network attempt for 5s for instant 0ms fallback
  if (globalForPrisma.isDbAvailable === false && now - (globalForPrisma.lastDbCheck || 0) < 5000) {
    return null;
  }

  globalForPrisma.lastDbCheck = now;
  try {
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('DB_TIMEOUT')), timeoutMs);
    });

    const result = await Promise.race([queryFn(), timeoutPromise]);
    clearTimeout(timer!);
    globalForPrisma.isDbAvailable = true;
    return result;
  } catch (err) {
    globalForPrisma.isDbAvailable = false;
    return null;
  }
}
