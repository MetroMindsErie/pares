import supabase, { supabaseAuth } from '../utils/supabaseClient';

/**
 * Consolidated authentication service that handles both Supabase and other auth providers
 */
const authService = {
  /**
   * Get the current session state
   */
  getSession: async () => {
    return await supabaseAuth.getSession();
  },
  
  /**
   * Get the current user
   */
  getUser: async () => {
    try {
      if (!supabase?.auth) return { data: { user: null }, error: new Error('Auth not available') };
      
      if (typeof supabase.auth.getUser === 'function') {
        return await supabase.auth.getUser();
      } else {
        // Fallback for older versions
        const { data, error } = await supabaseAuth.getSession();
        return {
          data: { user: data?.session?.user || null },
          error
        };
      }
    } catch (error) {
      console.error('Error getting user:', error);
      return { data: { user: null }, error };
    }
  },
  
  /**
   * Sign in with email and password
   */
  signInWithPassword: async (email, password) => {
    try {
      if (!supabase?.auth) return { error: new Error('Auth not available') };
      
      if (typeof supabase.auth.signInWithPassword === 'function') {
        return await supabase.auth.signInWithPassword({ email, password });
      } else if (typeof supabase.auth.signIn === 'function') {
        // Legacy version
        return await supabase.auth.signIn({ email, password });
      }
      return { error: new Error('No compatible sign in method found') };
    } catch (error) {
      return { error };
    }
  },
  
  /**
   * Sign in with OAuth provider
   */
  signInWithOAuth: async (provider) => {
    try {
      if (!supabase?.auth) return { error: new Error('Auth not available') };
      
      if (typeof supabase.auth.signInWithOAuth === 'function') {
        return await supabase.auth.signInWithOAuth({ provider });
      } else if (typeof supabase.auth.signIn === 'function') {
        // Legacy version
        return await supabase.auth.signIn({ provider });
      }
      return { error: new Error('No compatible sign in method found') };
    } catch (error) {
      return { error };
    }
  },
  
  /**
   * Sign out
   */
  signOut: async () => {
    return await supabaseAuth.signOut();
  }
};

export default authService;
