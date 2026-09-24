const { execSync } = require('child_process');
const path = require('path');

// Ensure DATABASE_URL is set so prisma generate never fails during build time
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres.placeholder:dummy@aws-0.pooler.supabase.com:6543/postgres';
}

const schemaPath = path.resolve(__dirname, '../prisma/schema.prisma');
console.log('Generating Prisma Client with schema:', schemaPath);

const fs = require('fs');

try {
  execSync(`npx prisma generate --schema="${schemaPath}"`, {
    stdio: 'inherit',
    env: process.env,
  });
  console.log('✅ Prisma Client generated successfully.');
} catch (error) {
  // If Prisma Client already exists on Windows and DLL is locked by running dev server
  const clientExists = fs.existsSync(path.resolve(__dirname, '../../../node_modules/@prisma/client/index.js'));
  if (clientExists && process.platform === 'win32') {
    console.warn('⚠️ Prisma Client binary locked by active dev process, using existing generated client.');
  } else {
    console.error('❌ Failed to generate Prisma Client:', error);
    process.exit(1);
  }
}
