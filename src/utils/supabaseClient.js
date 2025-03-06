import { createClient } from '@supabase/supabase-js';

// Get environment variables with fallbacks for production
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Initialize client
let supabase = null;

try {
  // Check for required variables
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables. Authentication will not work.');
    
    // In development, provide more helpful error messages
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
      console.error('Make sure your .env.local file contains:');
      console.error('NEXT_PUBLIC_SUPABASE_URL=your-project-url');
      console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key');
    }
  } else {
    // Create the Supabase client with fallbacks for production issues
    const clientOptions = {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      },
      // Add global error handler
      global: {
        fetch: (...args) => {
          return fetch(...args).catch(error => {
            console.error('Supabase fetch error:', error);
            throw error;
          });
        }
      }
    };
    
    console.log('Creating Supabase client...');
    supabase = createClient(supabaseUrl, supabaseAnonKey, clientOptions);
    
    // Verify the client was created successfully
    if (supabase) {
      console.log('Supabase client created successfully');
      
      // Verify the auth object exists
      if (supabase.auth) {
        console.log('Auth methods available:', Object.keys(supabase.auth));
        
        // Check if OAuth is available
        if (typeof supabase.auth.signInWithOAuth === 'function') {
          console.log('OAuth sign in method available');
        } else {
          console.error('OAuth sign in method NOT available');
        }
      } else {
        console.error('Auth object not available on supabase client');
      }
    } else {
      console.error('Failed to create Supabase client');
    }
  }
} catch (error) {
  console.error('Error initializing Supabase client:', error);
}

// Check the auth state on initialization
if (typeof window !== 'undefined' && supabase?.auth) {
  try {
    supabase.auth.onAuthStateChange((event, session) => {
      console.log('Supabase auth state changed:', event);
    });
  } catch (error) {
    console.warn('Could not set up auth listener:', error);
  }
}

// Export as both default and named export to support different import styles
export const supabaseClient = supabase;

// Helper function to check Supabase client status
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

// Version-agnostic auth methods with better error handling
export const supabaseAuth = {
  getSession: async () => {
    try {
      if (!supabase?.auth) return { data: { session: null }, error: new Error('Supabase auth not available') };
      
      if (typeof supabase.auth.getSession === 'function') {
        return await supabase.auth.getSession();
      } else if (typeof supabase.auth.session === 'function') {
        // Legacy version support
        const session = supabase.auth.session();
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
      if (!supabase?.auth) return { error: new Error('Supabase auth not available') };
      
      if (typeof supabase.auth.signOut === 'function') {
        return await supabase.auth.signOut();
      }
      return { error: new Error('No compatible signOut method found') };
    } catch (error) {
      console.error('signOut error:', error);
      return { error };
    }
  }
};

export default supabase;
