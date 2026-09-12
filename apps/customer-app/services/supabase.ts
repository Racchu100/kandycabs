import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-supabase-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase.from('vehicles').select('id').limit(1);
    if (error && !error.message.includes('relation "public.vehicles" does not exist')) {
      return { success: false, message: error.message };
    }
    return { success: true, message: 'Supabase Connected Successfully' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Connection test failed' };
  }
}
