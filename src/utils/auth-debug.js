import supabase from '../lib/supabase-setup';

/**
 * Debug helper for auth/profile flow issues
 * Call this function from any component to get detailed diagnostics
 */
export const debugAuthFlow = async () => {
  console.group('🔍 Auth Flow Debug');
  
  try {
    // 1. Check current session

    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {

      console.groupEnd();
      return { authenticated: false };
    }
    



    
    // 2. Check for profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('hasprofile, profile_picture_url, facebook_access_token, facebook_user_id')
      .eq('id', session.user.id)
      .single();
      
    if (userError) {

    } else if (userData) {





    }
    
    // 3. Check for auth providers
    const { data: providerData } = await supabase
      .from('auth_providers')
      .select('*')
      .eq('user_id', session.user.id);
      

    
    // 4. Check reels
    const { data: reelsData } = await supabase
      .from('reels')
      .select('id')
      .eq('user_id', session.user.id);
      

    
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
