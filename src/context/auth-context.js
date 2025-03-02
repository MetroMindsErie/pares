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

  useEffect(() => {
    // Fetch session from Supabase (or cache) to initialize
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        // Optionally set role if available from user metadata or later by a separate query.
        setRole(session.user.user_metadata?.role || null);
        // Check if user has profile.
        const { data: profileData } = await supabase
          .from('users')
          .select('hasprofile, role')
          .eq('id', session.user.id)
          .single();
        setHasProfile(profileData?.hasprofile || false);
        // If role is stored on profile data, update it.
        if (profileData?.role) setRole(profileData.role);
      }
      setLoading(false);
    };

    fetchSession();

    // Listen for auth changes.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user || null);
        if (session?.user) {
          setRole(session.user.user_metadata?.role || null);
          const { data: profileData } = await supabase
            .from('users')
            .select('hasprofile, role')
            .eq('id', session.user.id)
            .single();
          setHasProfile(profileData?.hasprofile || false);
          if (profileData?.role) setRole(profileData.role);
        } else {
          setHasProfile(false);
          setRole(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    isAuthenticated: !!user,
    user,
    role,
    loading,
    hasProfile,
    signOut
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
