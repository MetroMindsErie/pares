import supabase from '../lib/supabase-setup';

/**
 * Debug function to check if a user has a Facebook connection
 * Logs all relevant information about the user's Facebook authentication status
 */
export const debugFacebookConnection = async (userId) => {
  console.group('Facebook Connection Debug');
  console.log('Checking Facebook connection for user:', userId);
  
  try {
    // Step 1: Check user metadata
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError) {
      console.error('Error fetching user:', userError);
    } else {
      console.log('User authenticated via:', user?.app_metadata?.provider);
      console.log('Has avatar URL in metadata:', !!user?.user_metadata?.avatar_url);
    }
    
    // Step 2: Check auth_providers table
    const { data: providerData, error: providerError } = await supabase
      .from('auth_providers')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'facebook');
    
    if (providerError) {
      console.error('Error checking auth_providers:', providerError);
    } else {
      console.log('Found auth_providers records:', providerData?.length || 0);
      console.log('Provider data:', providerData);
    }
    
    // Step 3: Check users table
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('facebook_access_token, facebook_user_id, profile_picture_url')
      .eq('id', userId)
      .single();
    
    if (userDataError) {
      console.error('Error checking users table:', userDataError);
    } else {
      console.log('Has Facebook token in users table:', !!userData?.facebook_access_token);
      console.log('Has Facebook ID in users table:', !!userData?.facebook_user_id);
      console.log('Has profile picture URL in users table:', !!userData?.profile_picture_url);
    }
    
    // Step 4: Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Error getting session:', sessionError);
    } else if (session) {
      console.log('Current session provider:', session.user?.app_metadata?.provider);
      console.log('Has provider token:', !!session.provider_token);
    } else {
      console.log('No active session');
    }
  } catch (error) {
    console.error('Debug error:', error);
  }
  
  console.groupEnd();
};

export default debugFacebookConnection;
