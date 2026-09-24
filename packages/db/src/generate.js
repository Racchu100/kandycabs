const { execSync } = require('child_process');
const path = require('path');

// Ensure DATABASE_URL is set so prisma generate never fails during build time
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres.placeholder:dummy@aws-0.pooler.supabase.com:6543/postgres';
}

const schemaPath = path.resolve(__dirname, '../prisma/schema.prisma');
console.log('Generating Prisma Client with schema:', schemaPath);

try {
  execSync(`npx prisma generate --schema="${schemaPath}"`, {
    stdio: 'inherit',
    env: process.env,
  });
  console.log('✅ Prisma Client generated successfully.');
} catch (error) {
  console.error('❌ Failed to generate Prisma Client:', error);
  process.exit(1);
}
