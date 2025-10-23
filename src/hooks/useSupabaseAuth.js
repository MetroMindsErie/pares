'use client';

import { useState, useEffect } from 'react';
import { createSupabaseClient } from '../lib/supabase/client';
import { clearCachedSearchResults } from '../lib/searchCache';

/**
 * Custom hook for Supabase authentication
 * - Persists user session across page navigations
 * - Handles auth state changes
 * - Provides loading states for UI
 * - Caches user data locally
 */
export function useSupabaseAuth() {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth on component mount
  useEffect(() => {
    const supabase = createSupabaseClient();
    let mounted = true;

    // Attempt to load data from localStorage first for faster render
    if (typeof window !== 'undefined') {
      try {
        const cachedUser = localStorage.getItem('pares_user');
        if (cachedUser) {
          setUser(JSON.parse(cachedUser));
        }
      } catch (e) {
        console.error('Error loading cached user:', e);
        // Clear potentially corrupted data
        localStorage.removeItem('pares_user');
      }
    }

    // Get current session from Supabase
    const loadUserSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        // Only update state if the component is still mounted
        if (mounted) {
          setSession(data.session);
          
          if (data.session?.user) {
            setUser(data.session.user);
            
            // Cache user data
            if (typeof window !== 'undefined') {
              localStorage.setItem('pares_user', JSON.stringify(data.session.user));
            }
            
            // Load additional user data if needed
            loadUserData(data.session.user.id);
          }
        }
      } catch (e) {
        console.error('Error loading user session:', e);
        if (mounted) {
          setError(e.message);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    // Load user data from database (favorites, etc.)
    const loadUserData = async (userId) => {
      try {
        // Fetch user profile, favorites, etc.
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
          
        if (error) throw error;
        
        // Cache user profile data
        if (mounted && data) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('pares_user_profile', JSON.stringify(data));
          }
        }
      } catch (e) {
        console.error('Error loading user data:', e);
      }
    };

    // Execute initial load
    loadUserSession();

    // Set up auth state change subscription
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        setSession(session);
        
        if (session?.user) {
          setUser(session.user);
          
          // Update cached user data
          if (typeof window !== 'undefined') {
            localStorage.setItem('pares_user', JSON.stringify(session.user));
          }
          
          // Load additional user data
          loadUserData(session.user.id);
        } else {
          setUser(null);
          
          // Clear cached user data
          if (typeof window !== 'undefined') {
            localStorage.removeItem('pares_user');
            localStorage.removeItem('pares_user_profile');
            localStorage.removeItem('pares_favorites');
            localStorage.removeItem('pares_recent_searches');
          }
        }
        
        setIsLoading(false);
      }
    });

    // Cleanup on unmount
    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  /**
   * Sign out the current user
   */
  const signOut = async () => {
    try {
      const supabase = createSupabaseClient();
      setIsLoading(true);
      
      // Set a flag in session to indicate we're in logout process
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('isLoggingOut', 'true');
      }
      
      // Clear ALL cache data before signing out
      if (typeof window !== 'undefined') {
        // Clear specific application caches
        localStorage.removeItem('pares_user');
        localStorage.removeItem('pares_user_profile');
        localStorage.removeItem('pares_favorites');
        localStorage.removeItem('pares_recent_searches');
        localStorage.removeItem('walletAddress');
        
        // Clear search cache using the utility
        clearCachedSearchResults();
        
        // For good measure, try to clear everything with these patterns
        for (const key in localStorage) {
          if (key.includes('pares_') || key.includes('supabase')) {
            localStorage.removeItem(key);
          }
        }
        
        for (const key in sessionStorage) {
          if (key.includes('pares_') || key.includes('supabase')) {
            sessionStorage.removeItem(key);
          }
        }
      }
      
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      // Update local state
      setUser(null);
      setSession(null);
      
      // Remove logout flag
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('isLoggingOut');
        
        // Force a full page reload and redirect to home
        window.location.href = '/';
      }
      
      return { success: true };
    } catch (e) {
      console.error('Error signing out:', e);
      setError(e.message);
      
      // Clean up even on error
      if (typeof window !== 'undefined') {
        clearCachedSearchResults();
        sessionStorage.removeItem('isLoggingOut');
        
        // Force reload even on error
        window.location.href = '/';
      }
      
      return { success: false, error: e };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    user,
    session,
    isLoading,
    error,
    signOut,
    isAuthenticated: !!user
  };
}