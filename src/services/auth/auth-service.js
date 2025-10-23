// services/auth.js
import supabase from '../../lib/supabase-setup';

/**
 * Sign up a new user with email and password
 */
export const signUpWithEmail = async (email, password, userData = {}) => {
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;

    if (authData?.user) {
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          hasprofile: false,
          created_at: new Date().toISOString(),
          ...userData
        });

      if (userError) throw userError;
    }

    return { data: authData, error: null };
  } catch (error) {
    console.error('Sign up error:', error);
    return { data: null, error };
  }
};

/**
 * Sign in with email and password
 */
export const signInWithEmail = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { data, error };
  } catch (error) {
    console.error('Sign in error:', error);
    return { data: null, error };
  }
};

/**
 * Sign in with a third-party provider
 */
export const signInWithProvider = async (provider) => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: provider === 'facebook' 
          ? 'email,public_profile,user_videos,user_posts'
          : 'profile email',
        queryParams: provider === 'facebook' 
          ? { auth_type: 'rerequest', response_type: 'token' } 
          : { access_type: 'offline', prompt: 'consent' }
      }
    });
    
    return { data, error };
  } catch (error) {
    console.error(`Sign in with ${provider} error:`, error);
    return { data: null, error };
  }
};

/**
 * Store provider-specific information after successful authentication
 */
export const storeProviderData = async (session) => {
  if (!session?.user) return { error: 'No user in session' };

  try {
    const userId = session.user.id;
    const provider = session.user.app_metadata?.provider;
    
    if (!provider) return { error: 'No provider information' };
    

    
    // Get provider identity
    const identityData = session.user.identities?.find(i => i.provider === provider);
    if (!identityData) {
      console.error('No identity data found in session:', session.user);
      return { error: 'No identity data found' };
    }
    


    
    // First check if the user exists in our users table
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();
      
    if (userCheckError && userCheckError.code === 'PGRST116') {
      // User doesn't exist, create them
      await supabase.from('users').insert({
        id: userId,
        email: session.user.email,
        first_name: session.user.user_metadata?.full_name?.split(' ')[0] || '',
        last_name: session.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
        avatar_url: session.user.user_metadata?.avatar_url,
        hasprofile: false,
        created_at: new Date().toISOString()
      });
    }
    
    // Store in auth_providers table
    await supabase.from('auth_providers').upsert({
      user_id: userId,
      provider,
      provider_user_id: identityData.id,
      access_token: session.provider_token,
      refresh_token: session.provider_refresh_token,
      token_expiry: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,provider' });
    
    // For Facebook, ensure token is also stored in users table for backward compatibility
    if (provider === 'facebook' && session.provider_token) {
      await supabase.from('users').update({
        facebook_access_token: session.provider_token,
        facebook_user_id: identityData.id,
        facebook_token_valid: true,
        facebook_token_updated_at: new Date().toISOString()
      }).eq('id', userId);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error storing provider data:', error);
    return { error };
  }
};

/**
 * Handle third-party auth callback
 */
export const handleAuthCallback = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) throw error;
  
  if (session?.user) {
    const { id: userId, email, user_metadata } = session.user;
    
    // Check if user exists in our users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (!existingUser) {
      // Create new user record with provider data
      await supabase.from('users').insert({
        id: userId,
        email,
        first_name: user_metadata?.full_name?.split(' ')[0] || '',
        last_name: user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
        avatar_url: user_metadata?.avatar_url,
        hasprofile: false,
        profile_type_id: 1 // default profile type
      });
      
      // Assign default role
      await supabase.from('user_roles').insert({
        user_id: userId,
        role_id: 2 // free_tier role
      });
    }
    
    // Store provider-specific information
    const provider = session.user.app_metadata?.provider;
    if (provider) {
      const { data: existingProvider } = await supabase
        .from('auth_providers')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', provider)
        .single();
        
      if (!existingProvider) {
        await supabase.from('auth_providers').insert({
          user_id: userId,
          provider,
          provider_user_id: session.user.identities?.[0]?.id,
          provider_data: user_metadata,
          access_token: session.provider_token,
          refresh_token: session.provider_refresh_token,
          token_expiry: session.expires_at ? 
            new Date(session.expires_at * 1000).toISOString() : null
        });
      }
    }
  }
  
  return { data: session, error };
};

/**
 * Sign out the current user
 */
export const signOut = async () => {
  try {
    // Capture user ID before signing out to use in cleanup
    const { data: { user } } = await supabase.auth.getUser();
    
    // First, clear any local storage items that might be causing issues
    if (user?.id) {
      localStorage.removeItem(`roleSaverRun_${user.id}`);
      sessionStorage.removeItem('selectedRoles');
      localStorage.removeItem('cryptoInvestorSelected');
      
      // Set a flag in session to indicate we're in logout process
      sessionStorage.setItem('isLoggingOut', 'true');
    }
    
    // Clear ALL application caches
    clearAllCacheData();
    
    // Perform the actual sign out
    const { error } = await supabase.auth.signOut();
    
    if (error) throw error;
    
    // Force clear session cookies as backup
    document.cookie.split(';').forEach(c => {
      document.cookie = c
        .replace(/^ +/, '')
        .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
    });
    
    // Remove the logout flag
    sessionStorage.removeItem('isLoggingOut');
    
    // After successful signout, ensure the page gets fully reloaded
    // and redirect to home page
    window.location.href = '/';
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Sign out error:', error);
    
    // Clean up logout flag even on error
    sessionStorage.removeItem('isLoggingOut');
    
    // Clear cache even on error
    clearAllCacheData();
    
    // Even on error, force reload and redirect to home page
    window.location.href = '/';
    
    return { success: false, error };
  }
};

/**
 * Helper function to clear all cache data
 */
function clearAllCacheData() {
  if (typeof window === 'undefined') return;
  
  try {
    // Clear application-specific localStorage items
    localStorage.removeItem('dashboard_lastAccessed');
    localStorage.removeItem('pares_user');
    localStorage.removeItem('pares_user_profile');
    localStorage.removeItem('pares_favorites');
    localStorage.removeItem('pares_recent_searches');
    localStorage.removeItem('walletAddress');
    
    // Clear search cache if the function exists
    if (typeof clearCachedSearchResults === 'function') {
      clearCachedSearchResults();
    } else {
      localStorage.removeItem('pares_search_cache');
    }
    
    // Clear all sessionStorage
    sessionStorage.removeItem('auth_redirected');
    sessionStorage.removeItem('returnAfterPermission');
    
    // For good measure, try to clear everything with these patterns
    for (const key in localStorage) {
      if (key.includes('pares_') || key.includes('supabase')) {
        localStorage.removeItem(key);
      }
    }
    
    for (const key in sessionStorage) {
      if (key.includes('pares_') || key.includes('supabase')) {
        sessionStorage.removeItem(key);
      }
    }
  } catch (e) {
    console.error('Error clearing cache data:', e);
  }
}

/**
 * Get the current logged in user
 */
export const getCurrentUser = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) throw error;
    
    if (!session?.user) {
      return { user: null, error: null };
    }

    // Get user data from our custom users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')  // Select all fields, not just hasprofile
      .eq('id', session.user.id)
      .single();
      
    if (userError) {
      // If user doesn't exist in our table yet, return the auth user
      if (userError.code === 'PGRST116') {

        
        // Create initial record for the user
        const initialUserData = {
          id: session.user.id,
          email: session.user.email,
          first_name: session.user.user_metadata?.full_name?.split(' ')[0] || '',
          last_name: session.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
          avatar_url: session.user.user_metadata?.avatar_url,
          hasprofile: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        await supabase.from('users').insert(initialUserData);
        
        return { 
          user: { 
            ...session.user, 
            ...initialUserData
          }, 
          error: null 
        };
      }
      throw userError;
    }
    
    // Ensure the user record has at least basic data
    if (userData && !userData.hasprofile) {
      // If we're missing name but have it in metadata, update the record
      if ((!userData.first_name || !userData.last_name) && 
          session.user.user_metadata?.full_name) {
        

        
        const firstName = session.user.user_metadata?.full_name?.split(' ')[0] || '';
        const lastName = session.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '';
        
        await supabase
          .from('users')
          .update({ 
            first_name: firstName,
            last_name: lastName,
            updated_at: new Date().toISOString()
          })
          .eq('id', session.user.id);
        
        // Update the userData object with the new values
        userData.first_name = firstName;
        userData.last_name = lastName;
      }
    }
    
    return { 
      user: { 
        ...session.user,
        ...userData
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return { user: null, error };
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (userData) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) throw authError;
    
    if (!user) {
      throw new Error('Not authenticated');
    }
    
    const { data, error } = await supabase
      .from('users')
      .update(userData)
      .eq('id', user.id)
      .select()
      .single();
      
    return { data, error };
  } catch (error) {
    console.error('Update profile error:', error);
    return { data: null, error };
  }
};

/**
 * Change user profile type
 */
export const changeProfileType = async (profileTypeId) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) throw authError;
    
    if (!user) {
      throw new Error('Not authenticated');
    }
    
    const { data, error } = await supabase
      .from('users')
      .update({ profile_type_id: profileTypeId })
      .eq('id', user.id)
      .select()
      .single();
      
    return { data, error };
  } catch (error) {
    console.error('Change profile type error:', error);
    return { data: null, error };
  }
};
