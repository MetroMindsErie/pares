import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { cacheRemove, makeUserCacheKey } from '../utils/clientCache';

const AuthContext = createContext({
  isAuthenticated: false,
  user: null,
  loading: false,
  hasprofile: null,
  login: async () => {},
  logout: async () => {},
  signup: async () => {},
  error: null,
  getRedirectPath: () => {} // Add this new function to the context type
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
      const ensureUserRow = async (supabaseClient, authUser) => {
        if (!supabaseClient || !authUser?.id) return;
        try {
          const { data: existing, error: existingError } = await supabaseClient
            .from('users')
            .select('id')
            .eq('id', authUser.id)
            .maybeSingle();

          if (existingError || !existing) {
            await supabaseClient.from('users').insert({
              id: authUser.id,
              email: authUser.email,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              hasprofile: false,
            });
          }
        } catch (err) {
          console.error('Error ensuring user record exists:', err);
        }
      };

      const initializeAuth = async () => {
        try {

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

            // Ensure a corresponding users table row exists.
            await ensureUserRow(supabaseClient, data.session.user);

            
            try {
              // Fetch full user data including roles from the users table
              const { data: userData, error: userError } = await supabaseClient
                .from('users')
                .select('*')  // Select all fields including roles
                .eq('id', data.session.user.id)
                .maybeSingle();
                
              if (!userError && userData) {
                // Merge the auth user with database user data
                const mergedUser = {
                  ...data.session.user,
                  ...userData
                };
                ('Merged user data with roles:', {
                  hasRoles: Array.isArray(userData.roles),
                  roles: userData.roles
                });
                setUser(mergedUser);
                setHasProfile(!!userData.hasprofile);
              } else {
                if (userError) console.error('Failed to fetch user data:', userError);
                setUser(data.session.user); // Fall back to just auth user
              }
            } catch (err) {
              console.error('Error fetching user profile:', err);
              setUser(data.session.user);
            }
            
            setIsAuthenticated(true);
          } else {

          }
          
          const { data: listener } = supabaseClient.auth.onAuthStateChange(async (event, session) => {

            
            if (event === 'SIGNED_IN' && session) {

              // Ensure a corresponding users table row exists.
              await ensureUserRow(supabaseClient, session.user);

              setIsAuthenticated(true);
              
              try {
                // Fetch full user data including roles
                const { data: userData, error: userError } = await supabaseClient
                  .from('users')
                  .select('*')  // Select all fields including roles
                  .eq('id', session.user.id)
                  .maybeSingle();
                  
                if (!userError && userData) {
                  // Merge the auth user with database user data
                  const mergedUser = {
                    ...session.user,
                    ...userData
                  };
                  ('Auth change - merged user data with roles:', {
                    hasRoles: Array.isArray(userData.roles),
                    roles: userData.roles
                  });
                  setUser(mergedUser);
                  setHasProfile(!!userData.hasprofile);
                } else {
                  if (userError) console.error('Failed to fetch user data on auth change:', userError);
                  setUser(session.user); // Fall back to just auth user
                }
              } catch (err) {
                console.error('Error fetching user profile on auth change:', err);
                setUser(session.user);
                setHasProfile(false);
              }
            } else if (event === 'SIGNED_OUT') {

              setUser(null);
              setIsAuthenticated(false);
              setHasProfile(null);
            } else if (event === 'USER_UPDATED') {

              if (session) {
                await refreshUserData(session.user.id);
              }
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
      
      // Use current window origin to support local development
      // This will be http://localhost:3001 in dev or your production URL in prod
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
      const redirectUrl = `${currentOrigin}/auth/callback`;
      
      console.log('🔐 Auth Provider Login:', {
        provider,
        redirectUrl,
        isDevelopment: currentOrigin.includes('localhost')
      });
      
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
      const userIdToClear = user?.id || null;

      // Clear any provider tokens in localStorage (including Facebook)
      try {
        localStorage.removeItem('facebook_token');
        localStorage.removeItem('fb_access_token');
        localStorage.removeItem('facebook_expiration');
        // Clear any other provider tokens that might be stored

      } catch (tokenError) {
        console.warn('Error clearing tokens from localStorage:', tokenError);
      }
      
      const { default: supabaseClient } = await import('../utils/supabaseClient');

      
      // Force reset auth state regardless of the API call outcome
      setUser(null);
      setIsAuthenticated(false);
      setHasProfile(null);

      // Clear per-user client caches so a subsequent login never restores stale state.
      if (userIdToClear) {
        cacheRemove(`aiAssistant:lastSearch:v1:${userIdToClear}`);
        cacheRemove(`aiAssistant:lastPricing:v1:${userIdToClear}`);
        cacheRemove(makeUserCacheKey({ namespace: 'userActivity', version: 'v1', userId: userIdToClear }));
      }
      
      const { error } = await supabaseClient.auth.signOut();
      
      if (error) {
        console.error('Error during signOut API call:', error);
        setError(error.message);
        return { error };
      }
      

      return { success: true };
    } catch (err) {
      console.error('Unexpected error during logout:', err);
      setError(err.message);
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  // Refresh the user data including roles from database
  const refreshUserData = useCallback(async (userId) => {
    if (!userId || !isBrowser) return;
    
    try {
      // Skip excessive logging - only log once when refreshing
      const { default: supabaseClient } = await import('../utils/supabaseClient');
      
      const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) {
        console.error('Error refreshing user data:', error);
        return;
      }
      
      if (data) {
        // Only log significant information
        const hasRoles = Array.isArray(data.roles) && data.roles.length > 0;
        const hasCryptoInvestor = hasRoles && data.roles.includes('crypto_investor');
        
        if (hasCryptoInvestor) {

        }
        
        // Ensure we don't lose auth data when updating with database data
        setUser(prevUser => ({
          ...prevUser,
          ...data
        }));
        
        setHasProfile(!!data.hasprofile);
        return data;
      }
    } catch (err) {
      console.error('Error in refreshUserData:', err);
    }
    return null;
  }, [isBrowser]);

  // Get user role with preference for crypto_investor
  const getUserRole = useCallback(() => {
    if (!user) {
      return 'user';
    }
    
    // Skip logging every time - it's causing spam
    
    // If roles isn't an array or is empty, return 'user'
    if (!Array.isArray(user.roles) || user.roles.length === 0) {
      // Try to refresh the user data in the background to load roles
      if (user.id) {
        refreshUserData(user.id);  
      }
      return 'user';
    }
    
    if (user.roles.includes('crypto_investor')) {
      return 'crypto_investor';
    } else if (user.roles.includes('broker')) {
      return 'broker';
    } else if (user.roles.includes('agent')) {
      return 'agent';
    }
    return 'user';
  }, [user, refreshUserData]);

  // Add this new function to determine the redirect path based on profile status
  const getRedirectPath = useCallback(() => {
    try {
      if (!isAuthenticated || !user) {
        return '/login';
      }
      
      if (hasprofile === null) {
        // If we're still loading profile data, or user logged out
        // Return null to prevent redirection loops
        return null;
      }
      
      // If hasprofile is explicitly false, redirect to profile creation
      if (hasprofile === false) {
        return '/create-profile?setup=true';
      }
      
      // If hasprofile is true, redirect to dashboard
      return '/dashboard';
    } catch (error) {
      console.error('Error in getRedirectPath:', error);
      // Default safe path in case of error
      return '/login';
    }
  }, [isAuthenticated, hasprofile, user]);

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
    signup,
    getUserRole,
    refreshUserData,
    getRedirectPath // Add the new function to the context value
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
