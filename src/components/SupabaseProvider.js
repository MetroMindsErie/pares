import React, { createContext, useContext, useState, useEffect } from 'react';
import supabaseClient, { checkSupabaseClient } from '../utils/supabaseClient';

const SupabaseContext = createContext({
  supabase: null,
  initialized: false,
  ready: false,
  error: null
});

const SupabaseProvider = ({ children }) => {
  // Always initialize these state values
  const [initialized, setInitialized] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  // Always call this effect
  useEffect(() => {
    try {
      // Check if supabase is initialized
      const status = checkSupabaseClient();
      
      setInitialized(status.initialized);
      setReady(status.initialized && status.authAvailable);
      
      if (status.error) {
        console.error('Supabase client error:', status.error);
        setError(status.error);
      }
    } catch (err) {
      console.error('Error initializing SupabaseProvider:', err);
      setError(err.message);
    }
  }, []);

  // Provide consistent value shape regardless of initialization state
  const value = {
    supabase: supabaseClient,
    initialized,
    ready,
    error
  };

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
};

export const useSupabase = () => useContext(SupabaseContext);
export default SupabaseProvider;
