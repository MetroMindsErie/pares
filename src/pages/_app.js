import React, { useEffect, useState } from 'react';
import '../styles/globals.css';
import '../styles/propertyTemplates.css';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Layout from '../components/Layout';
import { AuthProvider } from '../context/auth-context';
import SupabaseProvider from '../components/SupabaseProvider';
import validateEnvironmentVariables from '../utils/validateEnv';
import { useRouter } from 'next/router';
import { UserProvider, useUser } from '@supabase/auth-helpers-react';
import supabaseClient from '../utils/supabaseClient';

// Import Facebook utils conditionally to prevent crashes
let getFacebookProfilePicture, validateImageUrl;
try {
  const facebookUtils = require('../utils/facebookUtils');
  getFacebookProfilePicture = facebookUtils.getFacebookProfilePicture;
  validateImageUrl = facebookUtils.validateImageUrl;
} catch (error) {
  console.warn('Facebook utils could not be loaded:', error);
  // Create dummy functions as fallbacks
  getFacebookProfilePicture = async () => null;
  validateImageUrl = async () => false;
}

// Add global error handler for uncaught exceptions
if (typeof window !== 'undefined') {
  window.addEventListener('error', function(event) {
    console.error('Global error caught:', event.error);
    // Optionally report to analytics service
  });
  
  window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    // Optionally report to analytics service
  });
}

function MyApp({ Component, pageProps }) {
  const [isClient, setIsClient] = useState(false);
  const [initError, setInitError] = useState(null);

  // Set isClient to true when we're in the browser
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

  // If we have skipServerRender in props, only render on client side
  if (pageProps.skipServerRender && !isClient) {
    return <div>Loading...</div>;
  }

  // User profile component that handles Facebook profile image
  function UserProfileHandler() {
    const { user } = useUser();

    useEffect(() => {
      // Wrap in a try-catch to prevent app crashes
      try {
        async function handleUserSession() {
          if (!user) return;
          console.log('Auth state change detected:', user ? 'SIGNED_IN' : 'SIGNED_OUT');
          
          // Check if this is a Facebook user
          const isFacebookUser = user.app_metadata?.provider === 'facebook';
          if (isFacebookUser && typeof getFacebookProfilePicture === 'function') {
            console.log('Facebook user detected, attempting to fetch profile picture');
            
            try {
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
          }
        }
        
        handleUserSession();
      } catch (error) {
        console.error('Error in UserProfileHandler:', error);
      }
    }, [user]);

    // Separate function to update profile picture
    async function updateProfilePicture(userId, fbId, accessToken) {
      try {
        // Fetch profile picture using our utility with timeout
        const picturePromise = getFacebookProfilePicture(fbId, accessToken);
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
        const isValid = await validateImageUrl(pictureUrl);
        
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

    return null; // This component doesn't render anything
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <SupabaseProvider>
          {supabaseClient ? (
            <UserProvider supabaseClient={supabaseClient}>
              <UserProfileHandler />
              <Layout>
                <Component {...pageProps} />
              </Layout>
            </UserProvider>
          ) : (
            <>
              <div style={{padding: '10px', backgroundColor: '#FFFFA0', textAlign: 'center', fontSize: '14px'}}>
                Running in limited mode: Authentication is not available
              </div>
              <Layout>
                <Component {...pageProps} />
              </Layout>
            </>
          )}
        </SupabaseProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default MyApp;
