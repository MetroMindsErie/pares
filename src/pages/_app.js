import React, { useEffect, useState } from 'react';
import '../styles/globals.css';
import '../styles/propertyTemplates.css';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthProvider } from '../context/auth-context';
import SupabaseProvider from '../components/SupabaseProvider';
import validateEnvironmentVariables from '../utils/validateEnv';
import { UserProvider } from '@supabase/auth-helpers-react';
import supabaseClient from '../utils/supabaseClient';

// Add global error handler for uncaught exceptions
if (typeof window !== 'undefined') {
  window.addEventListener('error', function(event) {
    console.error('Global error caught:', event.error);
  });
  
  window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
  });
}

function MyApp({ Component, pageProps }) {
  const [isClient, setIsClient] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Set isClient to true when we're in the browser - always call this hook
  useEffect(() => {
    try {
      setIsClient(true);
      
      // Check and log environment info
      const envInfo = {
        nodeEnv: process.env.NODE_ENV,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasTrestleVars: !!process.env.NEXT_PUBLIC_TRESTLE_CLIENT_ID
      };
      console.log('Environment info:', envInfo);
      
      // Validate environment variables on startup
      if (process.env.NODE_ENV !== 'production') {
        validateEnvironmentVariables();
      }
      
      // Check for Supabase auth session
      if (supabaseClient?.auth) {
        const checkAuth = async () => {
          const { data } = await supabaseClient.auth.getSession();
          setCurrentUser(data?.session?.user || null);
          
          // Set up auth state change listener
          const { data: authListener } = supabaseClient.auth.onAuthStateChange(
            (event, session) => {
              setCurrentUser(session?.user || null);
            }
          );
          
          // Clean up listener on unmount
          return () => {
            if (authListener?.subscription?.unsubscribe) {
              authListener.subscription.unsubscribe();
            }
          };
        };
        
        checkAuth();
      }
    } catch (error) {
      console.error('Error during app initialization:', error);
    }
  }, []);

  // Use getLayout pattern if the page has it, otherwise use default Layout
  const getLayout = Component.getLayout || ((page) => page);

  // Always render with the same component structure to maintain hook order
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SupabaseProvider>
          {/* Always render UserProvider, with a fallback value if needed */}
          <UserProvider supabaseClient={supabaseClient || {}}>
            {getLayout(
              // Skip server render if needed
              (pageProps.skipServerRender && !isClient) ? (
                <div>Loading...</div>
              ) : (
                <Component {...pageProps} />
              )
            )}
          </UserProvider>
        </SupabaseProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default MyApp;
