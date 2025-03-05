import supabase from '../lib/supabase-setup';

/**
 * Store social provider authentication data in auth_providers table
 */
export async function storeSocialAuthProvider(userId, provider, providerId, accessToken) {
  console.log(`Storing ${provider} auth data for user ${userId}`);
  
  try {
    // Check if entry already exists
    const { data: existingData } = await supabase
      .from('auth_providers')
      .select('id')
      .eq('user_id', userId)
      .eq('provider', provider)
      .single();
    
    if (existingData) {
      // Update existing record
      await supabase
        .from('auth_providers')
        .update({
          provider_user_id: providerId,
          access_token: accessToken,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingData.id);
    } else {
      // Insert new record
      await supabase
        .from('auth_providers')
        .insert([{
          user_id: userId, 
          provider,
          provider_user_id: providerId,
          access_token: accessToken,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);
    }
    
    // If it's Facebook, also update the users table
    if (provider === 'facebook') {
      await supabase
        .from('users')
        .update({
          facebook_user_id: providerId,
          facebook_access_token: accessToken,
          facebook_token_updated_at: new Date().toISOString(),
          facebook_token_valid: true
        })
        .eq('id', userId);
    }
    
    return true;
  } catch (error) {
    console.error(`Error storing ${provider} auth:`, error);
    return false;
  }
}

/**
 * Check if user has a connection to specified social provider
 */
export async function isUserConnectedWithProvider(userId, provider) {
  try {
    // Check auth_providers table first
    const { data: providerData } = await supabase
      .from('auth_providers')
      .select('access_token')
      .eq('user_id', userId)
      .eq('provider', provider)
      .single();
      
    if (providerData?.access_token) return true;
    
    // If provider is facebook, also check users table as fallback
    if (provider === 'facebook') {
      const { data: userData } = await supabase
        .from('users')
        .select('facebook_access_token')
        .eq('id', userId)
        .single();
        
      return !!userData?.facebook_access_token;
    }
    
    return false;
  } catch (error) {
    console.error(`Error checking ${provider} connection:`, error);
    return false;
  }
}

/**
 * Handle storing Facebook token after auth
 */
export async function processFacebookAuth(session) {
  if (!session?.provider || session.provider !== 'facebook' || !session.user) {
    return false;
  }
  
  try {
    const { user } = session;
    
    // Get Facebook identity
    const fbIdentity = user.identities?.find(i => i.provider === 'facebook');
    if (!fbIdentity) return false;
    
    // Get token from user_metadata
    const fbToken = user.user_metadata?.provider_token;
    if (!fbToken) return false;
    
    // Store the token
    await storeSocialAuthProvider(
      user.id,
      'facebook',
      fbIdentity.id,
      fbToken
    );
    
    return true;
  } catch (error) {
    console.error('Error processing Facebook auth:', error);
    return false;
  }
}
