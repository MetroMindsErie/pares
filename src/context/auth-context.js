import React, { createContext, useContext, useEffect, useState } from 'react';
import supabaseClient from '../utils/supabaseClient';

// Create the auth context
const AuthContext = createContext({
  isAuthenticated: false,
  user: null,
  loading: true,
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
  const [error, setError] = useState(null);

  // Safe check for supabase client availability
  const hasSupabase = !!(supabaseClient && supabaseClient.auth);

  // Safe wrapper for auth methods
  const safeAuthCall = async (authMethod, ...args) => {
    if (!hasSupabase) {
      console.error('Supabase client not initialized');
      setError('Authentication service unavailable');
      return { error: 'Authentication service unavailable' };
    }
    
    try {
      return await authMethod(...args);
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication error');
      return { error: err.message || 'Authentication error' };
    }
  };

  // Auth methods that safely handle errors
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    
    const result = await safeAuthCall(
      async () => await supabaseClient.auth.signInWithPassword({ email, password })
    );
    
    setLoading(false);
    return result;
  };

  const loginWithProvider = async (provider) => {
    setLoading(true);
    setError(null);
    
    const result = await safeAuthCall(
      async () => await supabaseClient.auth.signInWithOAuth({ provider })
    );
    
    setLoading(false);
    return result;
  };

  const signup = async (email, password) => {
    setLoading(true);
    setError(null);
    
    const result = await safeAuthCall(
      async () => await supabaseClient.auth.signUp({ email, password })
    );
    
    setLoading(false);
    return result;
  };

  const logout = async () => {
    setLoading(true);
    setError(null);
    
    const result = await safeAuthCall(
      async () => await supabaseClient.auth.signOut()
    );
    
    setUser(null);
    setIsAuthenticated(false);
    setLoading(false);
    return result;
  };

  // Effect for initializing and setting up auth listener
  useEffect(() => {
    let authListener = null;
    
    const initializeAuth = async () => {
      if (!hasSupabase) {
        console.warn('Supabase client not available, skipping auth initialization');
        setLoading(false);
        return;
      }
      
      try {
        // Get initial session
        const { data, error } = await supabaseClient.auth.getSession();
        
        if (error) {
          console.error('Error getting auth session:', error);
          setError(error.message);
        } else if (data && data.session) {
          setUser(data.session.user);
          setIsAuthenticated(true);
        }
        
        // Set up auth state change listener
        const { data: listener } = supabaseClient.auth.onAuthStateChange((event, session) => {
          console.log('Auth state changed:', event);
          
          if (event === 'SIGNED_IN' && session) {
            setUser(session.user);
            setIsAuthenticated(true);
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setIsAuthenticated(false);
          }
        });
        
        authListener = listener;
      } catch (err) {
        console.error('Error in auth initialization:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    initializeAuth();
    
    // Clean up auth listener on unmount
    return () => {
      if (authListener && authListener.subscription && authListener.subscription.unsubscribe) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [hasSupabase]);

  // Prepare values object with all methods and state
  const values = {
    isAuthenticated,
    user,
    loading,
    error,
    login,
    loginWithProvider,
    logout,
    signup
  };

  return <AuthContext.Provider value={values}>{children}</AuthContext.Provider>;
};

// Hook for accessing auth context
export const useAuth = () => useContext(AuthContext);
