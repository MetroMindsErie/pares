import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Enhanced client setup with persistent sessions
const supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'pares-auth-storage'
  }
});

// Log client initialization - useful for debugging


// Export as both default AND named export for compatibility with different import styles
export default supabaseInstance;
export const supabase = supabaseInstance; // Add this line to fix the missing named export
export const supabaseClient = supabaseInstance;

// Add event listeners for auth state changes
if (typeof window !== 'undefined') {
    supabaseInstance.auth.onAuthStateChange((event, session) => {

    });
}

// Helper function to check Supabase client status
export const checkSupabaseClient = () => {
  try {
    if (!supabaseInstance) {
      return {
        initialized: false,
        authAvailable: false,
        authMethods: [],
        error: 'Supabase client not initialized'
      };
    }
    
    const authMethods = Object.keys(supabaseInstance.auth || {});
    return {
      initialized: !!supabaseInstance,
      authAvailable: !!supabaseInstance.auth,
      authMethods
    };
  } catch (error) {
    console.error('Error checking Supabase client:', error);
    return {
      initialized: false,
      authAvailable: false,
      authMethods: [],
      error: error.message
    };
  }
};

// Version-agnostic auth methods with better error handling
export const supabaseAuth = {
  getSession: async () => {
    try {
      if (!supabaseInstance?.auth) return { data: { session: null }, error: new Error('Supabase auth not available') };
      
      if (typeof supabaseInstance.auth.getSession === 'function') {
        return await supabaseInstance.auth.getSession();
      } else if (typeof supabaseInstance.auth.session === 'function') {
        // Legacy version support
        const session = supabaseInstance.auth.session();
        return { data: { session }, error: null };
      }
      return { data: { session: null }, error: new Error('No compatible session method found') };
    } catch (error) {
      console.error('getSession error:', error);
      return { data: { session: null }, error };
    }
  },
  
  signOut: async () => {
    try {
      if (!supabaseInstance?.auth) return { error: new Error('Supabase auth not available') };
      
      if (typeof supabaseInstance.auth.signOut === 'function') {
        return await supabaseInstance.auth.signOut();
      }
      return { error: new Error('No compatible signOut method found') };
    } catch (error) {
      console.error('signOut error:', error);
      return { error };
    }
  }
};
