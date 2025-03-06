import React, { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext({
  isAuthenticated: false,
  user: null,
  loading: false, // Make sure this is false by default
  hasProfile: null,
  login: async () => {},
  logout: async () => {},
  signup: async () => {},
  error: null
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // Initialize loading to false
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasProfile, setHasProfile] = useState(null);
  const [error, setError] = useState(null);
  const [isBrowser, setIsBrowser] = useState(false);
  
  // Create a stable reference to loginWithProvider to prevent undefined errors
  const loginWithProviderRef = React.useRef(async (provider) => {
    console.log('Default loginWithProvider called before initialization');
    return { error: 'Authentication not initialized yet' };
  });
  
  // Reset loading state if it's still true after component mount
  useEffect(() => {
    setIsBrowser(true);
    
    // Reset loading state if it persisted incorrectly
    const timer = setTimeout(() => {
      if (loading) {
        console.warn('Auth loading state persisted too long, resetting');
        setLoading(false);
      }
    }, 5000);
    
    return () => clearTimeout(timer);
  }, []);

  // Only import supabase client on the client-side to avoid SSR issues
  useEffect(() => {
    if (isBrowser) {
      const initializeAuth = async () => {
        try {
          // Dynamically import supabaseClient to avoid SSR issues
          const { default: supabaseClient } = await import('../utils/supabaseClient');
          
          // Skip if no supabase client
          if (!supabaseClient?.auth) {
            console.warn('Supabase client not available');
            setLoading(false);
            return;
          }
          
          // Get initial session
          const { data, error } = await supabaseClient.auth.getSession();
          
          if (error) {
            console.error('Error getting auth session:', error);
            setError(error.message);
          } else if (data && data.session) {
            setUser(data.session.user);
            setIsAuthenticated(true);
            
            // Check if user has a profile
            const { data: profileData } = await supabaseClient
              .from('profiles')
              .select('*')
              .eq('id', data.session.user.id)
              .single();
              
            setHasProfile(!!profileData);
          }
          
          // Set up auth state change listener
          const { data: listener } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state changed:', event);
            
            if (event === 'SIGNED_IN' && session) {
              setUser(session.user);
              setIsAuthenticated(true);
              
              // Check profile status on sign-in
              const { data: profileData } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();
                
              setHasProfile(!!profileData);
            } else if (event === 'SIGNED_OUT') {
              setUser(null);
              setIsAuthenticated(false);
              setHasProfile(null);
            }
          });
          
          // Store listener for cleanup
          return () => {
            if (listener?.subscription?.unsubscribe) {
              listener.subscription.unsubscribe();
            }
          };
        } catch (err) {
          console.error('Error initializing auth:', err);
        } finally {
          setLoading(false);
        }
      };
      
      initializeAuth();
    }
  }, [isBrowser]);

  // Auth methods that safely handle errors - these will be properly initialized in client side
  const login = async (email, password) => {
    if (!isBrowser) return { error: 'Cannot login during server rendering' };
    
    setLoading(true);
    setError(null);
    
    try {
      const { default: supabaseClient } = await import('../utils/supabaseClient');
      const { data, error } = await supabaseClient.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) throw error;
      return { data };
    } catch (err) {
      setError(err.message);
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  const loginWithProvider = async (provider) => {
    if (!isBrowser) return { error: 'Cannot login during server rendering' };
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Initiating ${provider} login flow`);
      
      // Import the Supabase client with better error handling
      let supabaseClient;
      try {
        const module = await import('../utils/supabaseClient');
        supabaseClient = module.default;
        if (!supabaseClient) {
          console.error('Failed to load Supabase client');
          throw new Error('Authentication service unavailable');
        }
      } catch (importError) {
        console.error('Failed to import Supabase client:', importError);
        throw new Error('Authentication service unavailable');
      }
      
      // Check if the signInWithOAuth method exists
      if (!supabaseClient.auth || typeof supabaseClient.auth.signInWithOAuth !== 'function') {
        console.error('Auth method signInWithOAuth not available');
        throw new Error('Authentication method not available');
      }
      
      // Get the current URL for the redirect
      const origin = typeof window !== 'undefined' 
        ? window.location.origin 
        : 'https://parealestatesolutions.com';
      
      // Configure redirectTo with fallback
      const redirectUrl = `${origin}/auth/callback`;
      console.log('Using redirect URL:', redirectUrl);
      
      // Use proper options format for Supabase OAuth
      const { data, error } = await supabaseClient.auth.signInWithOAuth({ 
        provider,
        options: {
          redirectTo: redirectUrl
        }
      });
      
      if (error) throw error;
      
      // Log successful OAuth initialization
      console.log(`${provider} auth flow started successfully`);
      return { data };
    } catch (err) {
      console.error(`${provider} auth error:`, err);
      setError(err.message || `Failed to authenticate with ${provider}`);
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  // Update the reference when the function is defined
  loginWithProviderRef.current = loginWithProvider;

  const signup = async (email, password) => {
    if (!isBrowser) return { error: 'Cannot signup during server rendering' };
    
    setLoading(true);
    setError(null);
    
    try {
      // Dynamic import of supabaseClient
      const { default: supabaseClient } = await import('../utils/supabaseClient');
      const { data, error } = await supabaseClient.auth.signUp({ 
        email, 
        password 
      });
      
      if (error) throw error;
      return { data };
    } catch (err) {
      setError(err.message);
      return { error: err };
    } finally {
      // Always set loading to false when done
      setLoading(false);
    }
  };

  const logout = async () => {
    if (!isBrowser) return { error: 'Cannot logout during server rendering' };
    
    setLoading(true);
    setError(null);
    
    try {
      const { default: supabaseClient } = await import('../utils/supabaseClient');
      const { error } = await supabaseClient.auth.signOut();
      
      if (error) throw error;
      
      setUser(null);
      setIsAuthenticated(false);
      setHasProfile(null);
      return { error: null };
    } catch (err) {
      setError(err.message);
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  // Prepare values object with all methods and state
  const value = {
    isAuthenticated,
    user,
    loading,
    hasProfile,
    error,
    login,
    // Use the stable reference to ensure it's always a function
    loginWithProvider: (...args) => loginWithProviderRef.current(...args),
    logout,
    signup
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
