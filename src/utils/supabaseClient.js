import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Enhanced client setup with persistent sessions and better error handling
const supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'pares-auth-storage',
    // Add timeout and better error handling
    flowType: 'pkce',
    debug: process.env.NODE_ENV === 'development'
  },
  global: {
    headers: {
      'x-client-info': 'pares-homes'
    },
    fetch: (url, options = {}) => {
      // Add timeout to prevent hanging on 522 errors
      const timeout = 10000; // 10 seconds
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      
      return fetch(url, {
        ...options,
        signal: controller.signal
      }).finally(() => clearTimeout(id));
    }
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
      // Clear storage on sign out to prevent stale tokens
      if (event === 'SIGNED_OUT') {
        try {
          localStorage.removeItem('pares-auth-storage');
          sessionStorage.removeItem('isLoggingOut');
        } catch (e) {
          // Ignore storage errors
        }
      }
    });
    
    // Clear any stale auth data on load if we detect auth errors
    window.addEventListener('load', () => {
      const storageKey = 'pares-auth-storage';
      try {
        const authData = localStorage.getItem(storageKey);
        if (authData) {
          const parsed = JSON.parse(authData);
          // Check if token is expired (basic check)
          if (parsed.expires_at && new Date(parsed.expires_at * 1000) < new Date()) {
            console.warn('Clearing expired auth session');
            localStorage.removeItem(storageKey);
          }
        }
      } catch (e) {
        // If we can't parse the auth data, clear it
        console.warn('Clearing corrupted auth data');
        localStorage.removeItem(storageKey);
      }
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
