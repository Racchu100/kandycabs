/**
 * Build-time and runtime environment check.
 * Confirms that DATABASE_URL does not contain "localhost" or "127.0.0.1"
 * when NODE_ENV is set to "production".
 */
function validateDatabaseUrl() {
  const isProd = process.env.NODE_ENV === 'production';
  const dbUrl = process.env.DATABASE_URL;

  if (isProd) {
    if (!dbUrl) {
      console.error('\x1b[31m%s\x1b[0m', '❌ BUILD ERROR: DATABASE_URL is required in production environment.');
      process.exit(1);
    }

    if (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) {
      console.error(
        '\x1b[31m%s\x1b[0m',
        '❌ BUILD ERROR: DATABASE_URL contains "localhost" / "127.0.0.1" in production mode. A remote Supabase pooled connection string is required.'
      );
      process.exit(1);
    }
  }

  console.log('\x1b[32m%s\x1b[0m', '✅ Database URL environment check passed.');
}

validateDatabaseUrl();

module.exports = { validateDatabaseUrl };
