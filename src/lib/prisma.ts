import { PrismaClient } from '@prisma/client';

const SUPABASE_DB_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres.xgpfxtpwyavtgvycwrqu:DynxUycOEHAqxnZo@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = SUPABASE_DB_URL;
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasourceUrl: SUPABASE_DB_URL,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
