import React, { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext({
  isAuthenticated: false,
  user: null,
  loading: false,
  hasprofile: null,
  login: async () => {},
  logout: async () => {},
  signup: async () => {},
  error: null
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasprofile, setHasProfile] = useState(null);
  const [error, setError] = useState(null);
  const [isBrowser, setIsBrowser] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  
  const loginWithProviderRef = React.useRef(async (provider) => {
    console.log('Default loginWithProvider called before initialization');
    return { error: 'Authentication not initialized yet' };
  });
  
  useEffect(() => {
    setIsBrowser(true);
    
    const timer = setTimeout(() => {
      if (loading) {
        console.warn('Auth loading state persisted too long, resetting');
        setLoading(false);
        setAuthChecked(true);
      }
    }, 5000);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isBrowser) {
      const initializeAuth = async () => {
        try {
          console.log('Initializing auth context');
          setLoading(true);
          const { default: supabaseClient } = await import('../utils/supabaseClient');
          
          if (!supabaseClient?.auth) {
            console.warn('Supabase client not available');
            setLoading(false);
            setAuthChecked(true);
            return;
          }
          
          const { data, error } = await supabaseClient.auth.getSession();
          
          if (error) {
            console.error('Error getting auth session:', error);
            setError(error.message);
          } else if (data && data.session) {
            console.log('Found existing session, user authenticated');
            setUser(data.session.user);
            setIsAuthenticated(true);
            
            try {
              const { data: userData, error: userError } = await supabaseClient
                .from('users')
                .select('hasprofile')
                .eq('id', data.session.user.id)
                .single();
                
              if (!userError && userData) {
                setHasProfile(!!userData.hasprofile);
              }
            } catch (err) {
              console.error('Error checking profile status:', err);
            }
          } else {
            console.log('No active session found');
          }
          
          const { data: listener } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state changed:', event);
            
            if (event === 'SIGNED_IN' && session) {
              console.log('User signed in:', session.user.id);
              setUser(session.user);
              setIsAuthenticated(true);
              
              try {
                const { data: userData, error: userError } = await supabaseClient
                  .from('users')
                  .select('hasprofile')
                  .eq('id', session.user.id)
                  .single();
                  
                if (!userError && userData) {
                  setHasProfile(!!userData.hasprofile);
                }
              } catch (err) {
                console.error('Error checking profile status:', err);
              }
            } else if (event === 'SIGNED_OUT') {
              console.log('User signed out');
              setUser(null);
              setIsAuthenticated(false);
              setHasProfile(null);
            }
          });

          setAuthChecked(true);          
          setLoading(false);
          
          return () => {
            if (listener?.subscription?.unsubscribe) {
              listener.subscription.unsubscribe();
            }
          };
        } catch (err) {
          console.error('Error initializing auth:', err);
          setAuthChecked(true);
          setLoading(false);
        }
      };
      
      initializeAuth();
    }
  }, [isBrowser]);

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
      const origin = window.location.origin;
      const redirectUrl = `${origin}/auth/callback`;
      
      const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          scopes: provider === 'facebook' ? 'public_profile,email' : undefined
        }
      });
      
      if (error) throw error;
      
      return { data };
    } catch (err) {
      console.error(`Error during ${provider} signin:`, err);
      setError(err.message);
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  loginWithProviderRef.current = loginWithProvider;

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

  const value = {
    isAuthenticated,
    user,
    loading,
    hasprofile,
    error,
    authChecked,
    login,
    loginWithProvider: (...args) => loginWithProviderRef.current(...args),
    logout,
    signup
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
