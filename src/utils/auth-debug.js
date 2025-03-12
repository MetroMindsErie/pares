import supabase from '../lib/supabase-setup';

/**
 * Debug helper for auth/profile flow issues
 * Call this function from any component to get detailed diagnostics
 */
export const debugAuthFlow = async () => {
  console.group('🔍 Auth Flow Debug');
  
  try {
    // 1. Check current session
    console.log('Checking current session...');
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('❌ No active session found');
      console.groupEnd();
      return { authenticated: false };
    }
    
    console.log('✅ Active session found for user:', session.user.id);
    console.log('Auth provider:', session.user.app_metadata?.provider);
    console.log('Has provider token:', !!session.provider_token);
    
    // 2. Check for profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('hasprofile, profile_picture_url, facebook_access_token, facebook_user_id')
      .eq('id', session.user.id)
      .single();
      
    if (userError) {
      console.log('❌ Error fetching user profile:', userError.message);
    } else if (userData) {
      console.log('✅ User profile found:');
      console.log('- Has profile:', userData.hasprofile);
      console.log('- Has profile picture:', !!userData.profile_picture_url);
      console.log('- Has Facebook token:', !!userData.facebook_access_token);
      console.log('- Has Facebook ID:', !!userData.facebook_user_id);
    }
    
    // 3. Check for auth providers
    const { data: providerData } = await supabase
      .from('auth_providers')
      .select('*')
      .eq('user_id', session.user.id);
      
    console.log('Auth providers:', providerData?.length || 0);
    
    // 4. Check reels
    const { data: reelsData } = await supabase
      .from('reels')
      .select('id')
      .eq('user_id', session.user.id);
      
    console.log('Reels count:', reelsData?.length || 0);
    
    console.groupEnd();
    return { authenticated: true, userId: session.user.id, hasProfile: !!userData?.hasprofile };
  } catch (error) {
    console.error('Debug error:', error);
    console.groupEnd();
    return { error: error.message };
  }
};

/**
 * Add to global window object for easy console debugging
 */
if (typeof window !== 'undefined') {
  window.debugAuthFlow = debugAuthFlow;
}

export default debugAuthFlow;
