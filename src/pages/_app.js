import React, { useEffect, useState } from 'react';
import '../styles/globals.css';
import '../styles/propertyTemplates.css';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Layout from '../components/Layout';
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

// Safe import check without conditional execution
const facebookUtils = {
  getFacebookProfilePicture: async () => null,
  validateImageUrl: async () => false
};

// Only try to override if we're in a browser environment
if (typeof window !== 'undefined') {
  try {
    const importedUtils = require('../utils/facebookUtils');
    if (importedUtils.getFacebookProfilePicture) {
      facebookUtils.getFacebookProfilePicture = importedUtils.getFacebookProfilePicture;
    }
    if (importedUtils.validateImageUrl) {
      facebookUtils.validateImageUrl = importedUtils.validateImageUrl;
    }
  } catch (error) {
    console.warn('Facebook utils could not be loaded:', error);
  }
}

// Separate this component to avoid hooks ordering issues
function FacebookProfileUpdater({ user }) {
  useEffect(() => {
    if (!user) return;
    
    const updateFacebookProfilePicture = async () => {
      try {
        console.log('Auth state change detected:', 'SIGNED_IN');
        
        // Check if this is a Facebook user
        const isFacebookUser = user.app_metadata?.provider === 'facebook';
        if (!isFacebookUser) return;
        
        console.log('Facebook user detected, attempting to fetch profile picture');
        
        // Safely attempt to get Facebook data
        const { data: providerData, error } = await supabaseClient
          .from('auth_providers')
          .select('provider_user_id, access_token')
          .eq('user_id', user.id)
          .eq('provider', 'facebook')
          .single();
          
        if (error) {
          console.warn('Could not fetch auth provider data:', error);
          return;
        }
          
        if (providerData?.provider_user_id && providerData?.access_token) {
          console.log('Got Facebook credentials, fetching profile picture');
          await updateProfilePicture(
            user.id, 
            providerData.provider_user_id, 
            providerData.access_token
          );
        }
      } catch (error) {
        // Don't let Facebook errors crash the app
        console.error('Error handling Facebook profile:', error);
      }
    };
    
    updateFacebookProfilePicture();
  }, [user]);
  
  return null;
}

// Separate function to update profile picture
async function updateProfilePicture(userId, fbId, accessToken) {
  try {
    // Fetch profile picture using our utility with timeout
    const picturePromise = facebookUtils.getFacebookProfilePicture(fbId, accessToken);
    const pictureUrl = await Promise.race([
      picturePromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
    ]);
    
    // Skip update if no valid URL
    if (!pictureUrl) {
      console.warn('No valid picture URL obtained');
      return;
    }
    
    // Validate the URL is accessible
    const isValid = await facebookUtils.validateImageUrl(pictureUrl);
    
    if (isValid) {
      // Update the user's avatar_url if we have a valid picture
      const { error } = await supabaseClient
        .from('profiles')
        .update({ avatar_url: pictureUrl })
        .eq('id', userId);
        
      if (error) {
        console.error('Failed to update profile with Facebook picture:', error);
      } else {
        console.log('Successfully updated profile with Facebook picture');
      }
    } else {
      console.warn('Could not validate Facebook profile image URL');
    }
  } catch (error) {
    console.error('Error updating profile picture:', error);
  }
}

function MyApp({ Component, pageProps }) {
  const [isClient, setIsClient] = useState(false);
  const [initError, setInitError] = useState(null);
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
      setInitError(error);
    }
  }, []);

  // If there was an error during initialization
  if (initError) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Application Initialization Error</h1>
        <p>There was a problem starting the application. Please try refreshing the page.</p>
        <button onClick={() => window.location.reload()}>Refresh</button>
      </div>
    );
  }

  // Always render with the same component structure to maintain hook order
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SupabaseProvider>
          {/* Always render UserProvider, with a fallback value if needed */}
          <UserProvider supabaseClient={supabaseClient || {}}>
            {/* Only render the FacebookProfileUpdater if we have a user */}
            {currentUser && <FacebookProfileUpdater user={currentUser} />}
            
            {/* Conditionally show auth warning banner if needed */}
            {!supabaseClient && (
              <div style={{padding: '10px', backgroundColor: '#FFFFA0', textAlign: 'center', fontSize: '14px'}}>
                Running in limited mode: Authentication is not available
              </div>
            )}
            
            {/* Always render Layout to maintain component hierarchy */}
            <Layout>
              {/* Skip server render if needed */}
              {(pageProps.skipServerRender && !isClient) ? (
                <div>Loading...</div>
              ) : (
                <Component {...pageProps} />
              )}
            </Layout>
          </UserProvider>
        </SupabaseProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default MyApp;
