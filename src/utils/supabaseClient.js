import { createClient } from '@supabase/supabase-js';

// Create a singleton Supabase client instance
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Initialize client
let supabase = null;

try {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables. Authentication will not work.');
  } else {
    // Create the Supabase client
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    
    console.log('Supabase client created successfully');
    
    // Verify the auth object exists
    if (supabase.auth) {
      console.log('Auth methods available:', Object.keys(supabase.auth));
    } else {
      console.error('Auth object not available on supabase client');
    }
  }
} catch (error) {
  console.error('Error initializing Supabase client:', error);
}

// Export as both default and named export to support different import styles
export const supabaseClient = supabase;

// Helper function to log client info for debugging
export const checkSupabaseClient = () => {
  try {
    if (!supabase) {
      return {
        initialized: false,
        authAvailable: false,
        authMethods: [],
        error: 'Supabase client not initialized'
      };
    }
    
    const authMethods = Object.keys(supabase.auth || {});
    console.log('Supabase client initialized:', !!supabase);
    console.log('Auth object available:', !!supabase.auth);
    console.log('Available auth methods:', authMethods);
    return {
      initialized: !!supabase,
      authAvailable: !!supabase.auth,
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

// Create a version-agnostic wrapper for common auth methods
export const supabaseAuth = {
  getSession: async () => {
    try {
      if (!supabase || !supabase.auth) return { data: { session: null }, error: new Error('Supabase auth not available') };
      
      if (typeof supabase.auth.getSession === 'function') {
        return await supabase.auth.getSession();
      } else if (typeof supabase.auth.session === 'function') {
        // Legacy version support
        const session = supabase.auth.session();
        return { data: { session }, error: null };
      }
      return { data: { session: null }, error: new Error('No compatible session method found') };
    } catch (error) {
      return { data: { session: null }, error };
    }
  },
  
  signOut: async () => {
    try {
      if (!supabase || !supabase.auth) return { error: new Error('Supabase auth not available') };
      
      if (typeof supabase.auth.signOut === 'function') {
        return await supabase.auth.signOut();
      }
      return { error: new Error('No compatible signOut method found') };
    } catch (error) {
      return { error };
    }
  }
};

export default supabase;
