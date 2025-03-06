/**
 * This file is no longer needed as we're relying on Supabase's built-in provider tracking
 * and the users table's hasprofile field for determining redirect flow
 */

// No-op function that won't cause errors if it's still imported somewhere
export async function ensureAuthProviderSaved() {
  return { success: true };
}

export default ensureAuthProviderSaved;
