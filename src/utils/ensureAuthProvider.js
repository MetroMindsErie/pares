/**
 * Utility function to ensure auth provider info is correctly saved
 * This helps fix cases where the auth provider record might not be properly saved
 */

import { supabase } from './supabaseClient';

export async function ensureAuthProviderSaved(userId, provider = 'facebook') {
  try {
    // Get current user auth identities
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No authenticated user found');
      return { error: 'No authenticated user' };
    }
    
    // Check if identity for this provider exists
    const identities = user.identities || [];
    const hasProviderIdentity = identities.some(
      identity => identity.provider === provider
    );
    
    if (!hasProviderIdentity) {
      console.warn(`Identity for provider ${provider} not found, authentication may be incomplete`);
    }
    
    // Update user record to ensure provider is recorded
    const { data, error } = await supabase
      .from('user_providers')
      .upsert({
        user_id: userId || user.id,
        provider_id: provider,
        provider_type: provider,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id, provider_id',
        returning: 'minimal'
      });
      
    if (error) {
      throw error;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error ensuring auth provider is saved:', error);
    return { error };
  }
}

export default ensureAuthProviderSaved;
