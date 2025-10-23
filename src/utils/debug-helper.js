import supabase from '../lib/supabase-setup';

/**
 * Debug function to check if a user has a Facebook connection
 * Logs all relevant information about the user's Facebook authentication status
 */
export const debugFacebookConnection = async (userId) => {
  console.group('Facebook Connection Debug');

  
  try {
    // Step 1: Check user metadata
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError) {
      console.error('Error fetching user:', userError);
    } else {


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



    }
    
    // Step 4: Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Error getting session:', sessionError);
    } else if (session) {


    } else {

    }
  } catch (error) {
    console.error('Debug error:', error);
  }
  
  console.groupEnd();
};

export default debugFacebookConnection;
