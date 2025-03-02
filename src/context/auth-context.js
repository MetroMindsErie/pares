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
  const [role, setRole] = useState(null);
  const [hasProfile, setHasProfile] = useState(false);

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear all auth states
      setUser(null);
      setRole(null);
      setHasProfile(false);
      setLoading(false);
      
      // Redirect to home page handled by component
    } catch (error) {
      console.error('Error signing out:', error.message);
      setLoading(false);
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
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          if (mounted) setLoading(false);
          return;
        }

        if (mounted && session?.user) {
          setUser(session.user);

          // Only check users table if we have a session
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('hasprofile')
            .eq('id', session.user.id)
            .single();
          
          if (userError && userError.code !== 'PGRST116') {
            console.error('User fetch error:', userError);
          }
          
          setHasProfile(userData?.hasprofile || false);
        } else {
          setUser(null);
          setHasProfile(false);
        }

        setLoading(false);
      } catch (error) {
        console.error('Session fetch error:', error);
        if (mounted) setLoading(false);
      }
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event);
        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
          // No need to check hasProfile here, it will be handled by fetchSession
        } else {
          setUser(null);
          setHasProfile(false);
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
