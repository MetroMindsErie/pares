import supabase from './supabase-setup';

/**
 * Initiates Facebook login flow
 * @returns {Promise<void>}
 */
export const loginWithFacebook = async () => {
  try {
    console.log('Initiating Facebook login...');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        scopes: 'email,public_profile,user_videos,user_photos,pages_show_list,instagram_basic',
        redirectTo: `${window.location.origin}/dashboard`
      }
    });

    if (error) {
      console.error('Facebook login error:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Facebook login exception:', error);
    throw error;
  }
};

/**
 * Checks if user has a valid Facebook connection
 * @returns {Promise<boolean>}
 */
export const checkFacebookConnection = async () => {
  try {
    // First check if the user has a Facebook provider
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;

    // Check for Facebook identity in identities array
    const facebookIdentity = session.user?.identities?.find(
      (identity) => identity.provider === 'facebook'
    );
    
    if (facebookIdentity) return true;

    // Fallback: check the auth_providers table
    const { data: providerData } = await supabase
      .from('auth_providers')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('provider', 'facebook')
      .single();

    return !!providerData;
  } catch (error) {
    console.error('Error checking Facebook connection:', error);
    return false;
  }
};

/**
 * Extracts Facebook token from URL hash or session
 */
export const extractFacebookToken = () => {
  // Check URL hash for token (happens on redirect back from Facebook)
  if (typeof window !== 'undefined' && window.location.hash) {
    const params = new URLSearchParams(window.location.hash.substring(1));
    const providerToken = params.get('provider_token');
    
    if (providerToken) {
      return providerToken;
    }
  }
  return null;
};

/**
 * Saves Facebook token to both users and auth_providers tables
 */
export const saveFacebookToken = async (userId, token, fbUserId) => {
  try {
    // Store in auth_providers table
    await supabase
      .from('auth_providers')
      .upsert({
        user_id: userId,
        provider: 'facebook',
        provider_user_id: fbUserId || userId,
        access_token: token,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,provider' });
      
    // Also store in users table for backup
    await supabase
      .from('users')
      .update({
        facebook_access_token: token,
        facebook_user_id: fbUserId || null,
        facebook_token_valid: true,
        facebook_token_updated_at: new Date().toISOString()
      })
      .eq('id', userId);
      
    return true;
  } catch (error) {
    console.error('Error saving Facebook token:', error);
    return false;
  }
};

// Get Facebook provider ID from user metadata
export const getFacebookProviderIdFromUser = (user) => {
  // Get provider ID from user metadata when available
  return user?.user_metadata?.provider_id || 
         user?.identities?.find(id => id.provider === 'facebook')?.id;
};
