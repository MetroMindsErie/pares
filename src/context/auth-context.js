// context/AuthContext.js
import { createContext, useContext, useState, useEffect } from 'react';
import supabase from '../lib/supabase-setup';

const AuthContext = createContext({});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // We'll store the user role if returned in the session or profile data.
  const [role, setRole] = useState(null);
  const [hasProfile, setHasProfile] = useState(false);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // Clear any user data from state
      setUser(null);
      setRole(null);
      setHasProfile(false);
    } catch (error) {
      console.error('Error signing out:', error.message);
      throw error;
    }
  };

  const signup = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error signing up:', error.message);
      throw error;
    }
  };

  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  useEffect(() => {
    let mounted = true;

    const fetchSession = async () => {
      try {
        console.log('Fetching session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          if (mounted) setLoading(false);
          return;
        }

        if (mounted) {
          console.log('Session status:', session ? 'Active' : 'No session');
          setUser(session?.user || null);
          setRole(session?.user?.user_metadata?.role || null);
          const { data: profileData } = await supabase
            .from('users')
            .select('hasprofile, role')
            .eq('id', session.user.id)
            .single();
          setHasProfile(profileData?.hasprofile || false);
          if (profileData?.role) setRole(profileData.role);
          setLoading(false);
        }
      } catch (error) {
        console.error('Session fetch error:', error);
        if (mounted) setLoading(false);
      }
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session ? 'Session exists' : 'No session');
        if (mounted) {
          setUser(session?.user || null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const value = {
    isAuthenticated: !!user,
    user,
    role,
    loading,
    hasProfile,
    signOut,
    signup,
    login, // Add login to context
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
