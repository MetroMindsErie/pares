import supabase from './supabase-setup';

/**
 * Initiates Facebook login with appropriate scopes for accessing reels
 */
export const loginWithFacebook = async () => {
  console.log('Starting Facebook OAuth flow...');
  
  let redirectUrl = `${window.location.origin}/auth/callback?provider=facebook&timestamp=${Date.now()}`;
  // Override with environment variable if provided
  if (process.env.NEXT_PUBLIC_APP_URL) {
    redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?provider=facebook&timestamp=${Date.now()}`;
  }

  try {
    // Include all the permissions we might need
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        scopes: 'email,public_profile,user_videos,user_posts',
        redirectTo: redirectUrl,
        queryParams: {
          // Force re-authentication to ensure we get fresh tokens
          auth_type: 'rerequest',
          // Ensure we get back a token with the right permissions
          response_type: 'token',
          // Preferred display
          display: 'popup'
        }
      }
    });
    
    if (error) {
      console.error('Facebook OAuth initialization error:', error);
      throw error;
    }
    
    console.log('Facebook OAuth flow started successfully');
    return data;
  } catch (error) {
    console.error('Facebook login error:', error);
    throw error;
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
