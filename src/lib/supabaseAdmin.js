import { createClient } from '@supabase/supabase-js';

let cachedAdminClient = null;

export function getSupabaseAdminClient() {
  if (cachedAdminClient) return cachedAdminClient;

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;

  const key =
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_ADMIN_KEY ||
    // Back-compat with existing codebase env naming (already used in API routes)
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    return null;
  }

  cachedAdminClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  return cachedAdminClient;
}
