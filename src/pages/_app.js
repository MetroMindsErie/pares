import React, { useEffect, useState } from 'react';
import '../styles/globals.css';
import '../styles/propertyTemplates.css';
import { ErrorBoundary } from '@/components/ErrorBoundry';
import Layout from '../components/Layout';
import { AuthProvider } from '../context/auth-context';
import SupabaseProvider from '../components/SupabaseProvider';
import validateEnvironmentVariables from '../utils/validateEnv';
import { useRouter } from 'next/router';
import { UserProvider, useUser } from '@supabase/auth-helpers-react';
// Fix the import by using the default export
import supabaseClient from '../utils/supabaseClient';
import { getFacebookProfilePicture, validateImageUrl } from '../utils/facebookUtils';

function MyApp({ Component, pageProps }) {
  const [isClient, setIsClient] = useState(false);

  // Set isClient to true when we're in the browser
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Validate environment variables on startup
    if (process.env.NODE_ENV !== 'production') {
      validateEnvironmentVariables();
    }
  }, []);

  // Add a custom getInitialProps to prevent automatic static optimization
  // for pages that require dynamic data
  if (Component.getInitialProps) {
    const originalGetInitialProps = Component.getInitialProps;
    Component.getInitialProps = async (ctx) => {
      // Skip data fetching during static generation
      if (!ctx.req) {
        return originalGetInitialProps(ctx);
      }

      // Return empty props during static build
      return { skipServerRender: true };
    };
  }

  // If we have skipServerRender in props, only render on client side
  if (pageProps.skipServerRender && !isClient) {
    return <div>Loading...</div>;
  }

  // User profile component that handles Facebook profile image
  function UserProfileHandler() {
    const { user } = useUser();
    const router = useRouter();

    useEffect(() => {
      async function handleUserSession() {
        if (!user) return;
        
        console.log('Auth state change detected:', user ? 'SIGNED_IN' : 'SIGNED_OUT');
        
        // Check if this is a Facebook user
        const isFacebookUser = user.app_metadata?.provider === 'facebook';
        if (isFacebookUser) {
          console.log('Facebook user detected, fetching profile picture');
          
          try {
            // Get Facebook ID and access token
            const { data: providerData } = await supabaseClient
              .from('auth_providers')
              .select('provider_user_id, access_token')
              .eq('user_id', user.id)
              .eq('provider', 'facebook')
              .single();
              
            if (providerData?.provider_user_id && providerData?.access_token) {
              // Fetch profile picture using our utility
              const pictureUrl = await getFacebookProfilePicture(
                providerData.provider_user_id,
                providerData.access_token
              );
              
              // Validate the URL is accessible
              const isValid = pictureUrl && await validateImageUrl(pictureUrl);
              
              if (isValid) {
                // Update the user's avatar_url if we have a valid picture
                const { error } = await supabaseClient
                  .from('profiles')
                  .update({ avatar_url: pictureUrl })
                  .eq('id', user.id);
                  
                if (error) {
                  console.error('Failed to update profile with Facebook picture:', error);
                } else {
                  console.log('Successfully updated profile with Facebook picture');
                }
              } else {
                console.warn('Could not get a valid Facebook profile image');
              }
            }
          } catch (error) {
            console.error('Error handling Facebook profile:', error);
          }
        }
      }
      
      handleUserSession();
    }, [user]);

    return null; // This component doesn't render anything
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <SupabaseProvider>
          <UserProvider supabaseClient={supabaseClient}>
            <UserProfileHandler />
            <Component {...pageProps} />
          </UserProvider>
        </SupabaseProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default MyApp;
