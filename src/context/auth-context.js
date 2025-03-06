import React, { createContext, useContext, useEffect, useState } from 'react';

// Create the auth context with default values
const AuthContext = createContext({
  isAuthenticated: false,
  user: null,
  loading: true,
  hasProfile: null,
  login: async () => {},
  logout: async () => {},
  signup: async () => {},
  error: null
});

export const AuthProvider = ({ children }) => {
  // Always initialize these state values
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasProfile, setHasProfile] = useState(null);
  const [error, setError] = useState(null);
  const [isBrowser, setIsBrowser] = useState(false);

  // Detect if we're in a browser environment
  useEffect(() => {
    setIsBrowser(true);
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
      const { default: supabaseClient } = await import('../utils/supabaseClient');
      const { data, error } = await supabaseClient.auth.signInWithOAuth({ 
        provider 
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

  const signup = async (email, password) => {
    if (!isBrowser) return { error: 'Cannot signup during server rendering' };
    
    setLoading(true);
    setError(null);
    
    try {
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
    loginWithProvider,
    logout,
    signup
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook for accessing auth context
export const useAuth = () => useContext(AuthContext);
