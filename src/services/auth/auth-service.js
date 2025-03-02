// services/auth.js
import supabase from '../../lib/supabase-setup';

/**
 * Sign up a new user with email and password
 */
export const signUpWithEmail = async (email, password, userData = {}) => {
  try {
    // First register with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;

    // If auth successful, create the user record in our custom users table
    if (authData?.user) {
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          ...userData,
        });

      if (profileError) throw profileError;

      // Assign default role (assuming 'free_tier' with id=2)
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role_id: 2, // free_tier role
        });

      if (roleError) throw roleError;
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
  const { data, error } = await supabase.auth.getSession();
  
  if (error) {
    throw error;
  }
  
  if (data?.session?.user) {
    // Check if this user already exists in our users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.session.user.id)
      .single();
      
    if (!existingUser) {
      // Create new user record
      await supabase.from('users').insert({
        id: data.session.user.id,
        email: data.session.user.email,
      });
      
      // Assign default role
      await supabase.from('user_roles').insert({
        user_id: data.session.user.id,
        role_id: 2, // free_tier role
      });
    }
    
    // Store provider info
    const provider = data.session.user.app_metadata?.provider;
    const providerUserId = data.session.user.identities?.[0]?.id;
    
    if (provider && providerUserId) {
      const { data: existingProvider } = await supabase
        .from('auth_providers')
        .select('*')
        .eq('user_id', data.session.user.id)
        .eq('provider', provider)
        .single();
        
      if (!existingProvider) {
        await supabase.from('auth_providers').insert({
          user_id: data.session.user.id,
          provider,
          provider_user_id: providerUserId,
          access_token: data.session.provider_token || null,
          refresh_token: data.session.provider_refresh_token || null,
          token_expiry: data.session.expires_at 
            ? new Date(data.session.expires_at * 1000).toISOString()
            : null,
        });
      }
    }
  }
  
  return { data, error };
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
    const { data, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
      
    if (profileError) throw profileError;
    
    if (!data) {
      return { user: null, error: 'User not found' };
    }
    
    return { user: data, error: null };
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
