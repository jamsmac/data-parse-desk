// Enhanced Supabase client with validation and error handling
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { ENV } from '@/config/env';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate credentials before creating client
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    'Missing Supabase credentials. Please check your .env file.\n' +
    'Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
  );
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce', // More secure PKCE flow
    },
    global: {
      headers: {
        'x-client-info': 'data-parse-desk@2.0.0',
      },
    },
    db: {
      schema: 'public',
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

/**
 * Health check for Supabase connection
 * Returns true if connection is healthy, false otherwise
 */
export async function checkSupabaseHealth(): Promise<{
  healthy: boolean;
  latency: number;
  error?: string;
}> {
  const start = Date.now();

  try {
    // Lightweight query to check connection
    const { error } = await Promise.race([
      supabase.from('profiles').select('id').limit(1),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), ENV.api.timeout)
      ),
    ]);

    const latency = Date.now() - start;

    if (error) {
      return {
        healthy: false,
        latency,
        error: error.message,
      };
    }

    return {
      healthy: true,
      latency,
    };
  } catch (error) {
    return {
      healthy: false,
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Log auth state changes (development only)
 */
if (ENV.features.enableLogging) {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('🔐 Auth state changed:', event, session?.user?.email);
  });
}

// Global error handler for Supabase realtime errors
supabase.realtime.onError((error) => {
  console.error('❌ Supabase Realtime error:', error);
});