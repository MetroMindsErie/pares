import { useState, useEffect } from 'react';
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { SessionContextProvider } from '@supabase/auth-helpers-react';

const SupabaseProvider = ({ children }) => {
  const [supabaseClient] = useState(() => createBrowserSupabaseClient());
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    // Check if Supabase client is properly initialized
    const checkSupabase = async () => {
      try {
        const { data, error } = await supabaseClient.auth.getSession();
        console.log('Supabase auth ready:', !!supabaseClient.auth);
        console.log('Initial session:', !!data.session);
        if (error) console.error('Error checking session:', error);
      } catch (err) {
        console.error('Failed to initialize Supabase client:', err);
      } finally {
        setIsReady(true);
      }
    };
    
    checkSupabase();
  }, [supabaseClient]);
  
  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <SessionContextProvider supabaseClient={supabaseClient}>
      {children}
    </SessionContextProvider>
  );
};

export default SupabaseProvider;
