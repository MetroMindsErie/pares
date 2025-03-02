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
        scopes: provider === 'google' ? 'profile email' : 'email,public_profile',
        queryParams: provider === 'google' ? {
          access_type: 'offline',
          prompt: 'consent',
        } : undefined
      }
    });
    
    return { data, error };
  } catch (error) {
    console.error(`Sign in with ${provider} error:`, error);
    return { data: null, error };
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
  const { error } = await supabase.auth.signOut();
  return { error };
};

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

    // Get user data from our custom table with profile type and roles
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('hasprofile')
      .eq('id', session.user.id)
      .single();
      
    if (userError) throw userError;
    
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
      
    if (profileError) throw profileError;
    
    if (!profileData) {
      return { user: null, error: 'User not found' };
    }
    
    return { user: { ...profileData, hasprofile: userData.hasprofile }, error: null };
  } catch (error) {
    console.error('Get current user error:', error);
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

/**
 * Check if user has a specific role
 */
export const hasRole = async (roleName) => {
  try {
    const { user, error } = await getCurrentUser();
    
    if (error) throw error;
    
    if (!user) return false;
    
    return user.roles.includes(roleName);
  } catch (error) {
    console.error('Check role error:', error);
    return false;
  }
};
