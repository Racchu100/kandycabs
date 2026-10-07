import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

const DEFAULT_SUPABASE_URL = 'https://kkerjotsahmkwbldjdhf.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZXJqb3RzYWhta3dibGRqZGhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NTA3ODUsImV4cCI6MjEwNTIyNjc4NX0.8_tc7EdymXH6HohvxOhOmWMzSyOC2AG4c5ME3KiBv_0';

export function getSupabaseClient(): SupabaseClient | null {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    DEFAULT_SUPABASE_URL;

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_ANON_KEY;

  if (!url || !anonKey || url.includes('placeholder') || anonKey.includes('dummy')) {
    return null;
  }

  if (!supabaseClient) {
    try {
      supabaseClient = createClient(url, anonKey, {
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    } catch (err) {
      console.warn('[Supabase Client] Failed to initialize client:', err);
      return null;
    }
  }

  return supabaseClient;
}

