import React, { createContext, useContext, useState, useEffect } from 'react';
import supabase from '../lib/supabase-setup';
import axios from 'axios';
import { loginWithFacebook } from '../lib/facebook-auth';
import { fetchAndStoreFacebookProfilePicture } from '../lib/facebook-utils';
import { useRouter } from 'next/router';

const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
  loading: false
});

// Server API base URL
const API_URL = process.env.NODE_ENV === 'production' 
  ? process.env.NEXT_PUBLIC_API_URL 
  : 'http://localhost:5000';

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [socialConnections, setSocialConnections] = useState({
    facebook: false,
    google: false
  });
  const [profile, setProfile] = useState(null);
  const [hasProfile, setHasProfile] = useState(false);
  const router = useRouter();

  // Configure axios
  axios.defaults.withCredentials = true;

  useEffect(() => {
    // Check authentication status with both Passport and Supabase
    const checkAuthStatus = async () => {
      try {
        setLoading(true);
        
        // Remove or comment out the failing passport call:
        // const passportRes = await axios.get(`${API_URL}/auth/me`);
        
        // If not authenticated with Passport, check Supabase
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Supabase session:', session); // <-- Add this log

        if (session?.user) {
          setUser(session.user);
          setIsAuthenticated(true);
          
          // Check Facebook connection status
          try {
            // First check auth_providers table
            const { data: providerData } = await supabase
              .from('auth_providers')
              .select('provider')
              .eq('user_id', session.user.id)
              .eq('provider', 'facebook')
              .maybeSingle();
            
            if (providerData) {
              setSocialConnections(prev => ({...prev, facebook: true}));
            } else {
              // Then check users table
              const { data: userData } = await supabase
                .from('users')
                .select('facebook_access_token')
                .eq('id', session.user.id)
                .single();
                
              setSocialConnections(prev => ({
                ...prev, 
                facebook: !!userData?.facebook_access_token
              }));
            }
          } catch (err) {
            console.error('Error checking social connections:', err);
            setSocialConnections(prev => ({...prev, facebook: false}));
          }

          // Fetch user profile to determine if they have completed setup
          const { data, error: profileError } = await supabase
            .from('users')
            .select('hasprofile')
            .eq('id', session.user.id)
            .single();
            
          if (!profileError && data) {
            setHasProfile(data.hasprofile);
            setProfile(data);
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
          setSocialConnections({ facebook: false, google: false });
          setHasProfile(false);
          setProfile(null);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        // Clear state on error
        setUser(null);
        setIsAuthenticated(false);
        setSocialConnections({ facebook: false, google: false });
        setHasProfile(false);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuthStatus();
    
    // Force loading state to false after timeout
    const loadingTimeout = setTimeout(() => {
      console.log('Forcing loading state to false after timeout');
      setLoading(false);
    }, 5000);
    
    return () => clearTimeout(loadingTimeout);
  }, []);
  
  // Authentication methods
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };
  
  const signup = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  };
  
  const logout = async () => {
    try {
      // Logout from Passport
      await axios.get(`${API_URL}/auth/logout`).catch(console.error);
      
      // Logout from Supabase
      await supabase.auth.signOut();
      
      setUser(null);
      setIsAuthenticated(false);
      setSocialConnections({ facebook: false, google: false });
      setHasProfile(false);
      setProfile(null);
      
      // Redirect to login page
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  
  const connectFacebook = async () => {
    try {
      const result = await loginWithFacebook();
      if (result.success) {
        // Update social connections state after successful connection
        setSocialConnections(prev => ({...prev, facebook: true}));
        return result;
      }
      return result;
    } catch (error) {
      console.error('Facebook connection error:', error);
      return { success: false, error };
    }
  };

  // Enhanced sign-in handler that fetches profile picture for Facebook logins
  const handleSignInWithProvider = async (provider) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?provider=${provider}`
        }
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      setError(error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Handle user session changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Set the user and authentication status
      setUser(session?.user || null);
      setIsAuthenticated(!!session);
      setLoading(false);

      // When a user logs in, check if they're using Facebook
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        console.log('Auth state change detected:', event);
        
        // For Facebook users, fetch and save profile picture
        const isFacebookAuth = session.provider === 'facebook' || 
                              (session.user?.app_metadata?.provider === 'facebook') ||
                              session.provider_token;
        
        if (isFacebookAuth) {
          console.log('Facebook user detected, fetching profile picture');
          // Pass both user and provider_token
          await fetchAndStoreFacebookProfilePicture(
            session.user, 
            session.provider_token
          );
        }

        // Fetch user profile when auth state changes
        const { data, error } = await supabase
          .from('users')
          .select('hasprofile')
          .eq('id', session.user.id)
          .single();
          
        if (!error && data) {
          setHasProfile(data.hasprofile);
          setProfile(data);
        } else {
          setHasProfile(false);
          setProfile(null);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    profile,
    loading,
    isAuthenticated,
    socialConnections,
    login,
    signup,
    logout,
    connectFacebook,
    loginWithFacebook,
    hasProfile,
    signInWithProvider: handleSignInWithProvider
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
