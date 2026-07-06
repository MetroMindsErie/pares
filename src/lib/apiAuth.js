import { createClient } from '@supabase/supabase-js';

/**
 * Shared auth helpers for API routes (edge runtime compatible).
 * All helpers take the raw Authorization header value ("Bearer <supabase jwt>").
 */

export async function getUserFromAuthHeader(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const { data: { user }, error } = await authClient.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export async function getCallerRole(authHeader) {
  const user = await getUserFromAuthHeader(authHeader);
  if (!user) return null;

  // Prefer explicit role from JWT metadata when available.
  const metadataRole = user.app_metadata?.role || user.user_metadata?.role;
  if (metadataRole) return metadataRole;

  // Read role from users table using service key to avoid anon/RLS read failures.
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const { data } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  return data?.role || null;
}
