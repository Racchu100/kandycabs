import { prisma } from '@kandy-cabs/db';

async function verifySupabase() {
  console.log('🔍 Checking Supabase configuration & keys...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kkerjotsahmkwbldjdhf.supabase.co';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  console.log(`1. Supabase Project URL: ${supabaseUrl}`);

  // Test 1: Ping Supabase Auth endpoint with Anon Key
  console.log('\n2. Testing Anon Key against Supabase REST API...');
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    });

    if (res.status === 200 || res.status === 204) {
      console.log('   ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY is VALID and active!');
    } else {
      console.log(`   ⚠️ Anon key returned HTTP status ${res.status}`);
    }
  } catch (err: any) {
    console.error('   ❌ Failed to contact Supabase Auth endpoint:', err.message);
  }

  // Test 2: Test Service Role Key
  console.log('\n3. Testing Service Role Key against Supabase Admin API...');
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    });

    if (res.status === 200) {
      const data = await res.json();
      console.log(`   ✅ SUPABASE_SERVICE_ROLE_KEY is VALID! (Admin access verified, total registered users: ${data.users?.length || 0})`);
    } else {
      console.log(`   ⚠️ Service key returned HTTP status ${res.status}`);
    }
  } catch (err: any) {
    console.error('   ❌ Failed to contact Supabase Admin endpoint:', err.message);
  }

  // Test 3: Test Database query
  console.log('\n4. Testing PostgreSQL Database Connection via Prisma...');
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1 as connected`;
    const latency = Date.now() - start;
    console.log(`   ✅ PostgreSQL database is CONNECTED! (Latency: ${latency}ms)`);
  } catch (err: any) {
    console.error('   ❌ Database query failed:', err.message);
  }

  console.log('\n🎉 SUPABASE CONFIGURATION VERIFICATION COMPLETE!');
}

verifySupabase().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
