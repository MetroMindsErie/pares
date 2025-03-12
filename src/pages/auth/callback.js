import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import supabase from '../../lib/supabase-setup';

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    const handleAuthCallback = async () => {
      setLoading(true);
      console.log('Processing auth callback...');
      
      try {
        // IMPORTANT: First explicitly get the current session from supabase
        // This helps ensure we have the latest session data
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error in callback:', sessionError);
          setDebugInfo(prev => ({...prev, sessionError: sessionError.message}));
          throw sessionError;
        }
        
        // If no session, try to extract it from URL parameters (for hash-based callbacks)
        if (!session) {
          console.log('No session found in callback, checking URL params...');
          
          // This helps with providers like Facebook that might use hash fragments
          if (window.location.hash) {
            console.log('Found hash fragment, processing...');
            
            // Give browser a moment to process the hash fragment
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Try session again after hash processing
            const { data: { session: hashSession } } = await supabase.auth.getSession();
            
            if (hashSession) {
              console.log('Successfully retrieved session from hash fragments');
              // Continue with the session from hash
              processAuthenticatedUser(hashSession.user);
              return;
            }
          }
          
          console.error('No session found after all attempts');
          router.replace('/login?error=no_session');
          return;
        }
        
        const { user } = session;
        console.log('Auth callback processing for user:', user.id);
        await processAuthenticatedUser(user);
        
      } catch (err) {
        console.error('Error in auth callback:', err);
        
        // Add specific handling for Trestle token errors
        if (err.message && (
            err.message.includes('Trestle token') || 
            (typeof err === 'object' && err.error === 'invalid_request')
        )) {
          console.log('Detected Trestle token error, adding to debug info');
          setDebugInfo(prev => ({
            ...prev, 
            callbackError: err.message,
            trestleTokenError: true,
            trestleErrorDetails: JSON.stringify(err)
          }));
          
          // Still allow authentication to proceed despite Trestle error
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            console.log('Continuing with auth despite Trestle token error');
            await processAuthenticatedUser(session.user);
            return;
          }
        }
        
        setError(err.message || 'Authentication callback failed');
        setDebugInfo(prev => ({...prev, callbackError: err.message}));
        router.replace('/login?error=callback_error');
      } finally {
        setLoading(false);
      }
    };
    
    // Extracted the authenticated user processing to a separate function
    const processAuthenticatedUser = async (user) => {
      if (!user) {
        router.replace('/login');
        return;
      }
      
      try {
        // Check if we have provider data
        const provider = user.app_metadata?.provider;
        if (provider) {
          console.log('Processing provider:', provider);
          setDebugInfo(prev => ({...prev, provider}));
          
          // Store provider-specific information
          const identities = user.identities || [];
          const identity = identities.find(i => i.provider === provider);
          
          if (identity) {
            console.log('Found identity:', identity.id);
            setDebugInfo(prev => ({...prev, identityId: identity.id}));
            
            // Process Facebook data if needed
            if (provider === 'facebook') {
              await processFacebookData(user, identity.id);
            }
          }
        }
        
        // Check profile status and redirect accordingly
        await redirectBasedOnProfileStatus(user.id);
      } catch (err) {
        console.error('Error processing authenticated user:', err);
        
        // Add more detailed error logging
        const errorDetails = {
          message: err.message,
          stack: err.stack,
          isTrestleError: err.message && err.message.includes('Trestle')
        };
        
        setDebugInfo(prev => ({
          ...prev, 
          processingError: err.message,
          errorDetails: JSON.stringify(errorDetails)
        }));
        
        // Default to profile creation if there's an error
        router.replace('/profile?setup=true&error=processing');
      }
    };
    
    // Helper function to process Facebook data
    const processFacebookData = async (user, fbUserId) => {
      try {
        console.log('Processing Facebook data');
        setDebugInfo(prev => ({...prev, processingFacebook: true}));
        
        // Get tokens - try different sources
        const { data: { session } } = await supabase.auth.getSession();
        const providerToken = session?.provider_token || 
                             window.localStorage.getItem('provider_token') || 
                             null;
        
        if (!providerToken) {
          console.warn('No Facebook access token available');
          return;
        }
        
        // Get profile picture from Facebook
        let profilePictureUrl = user.user_metadata?.avatar_url || null;
        
        // If no picture in metadata, try to fetch from Facebook
        if (!profilePictureUrl && providerToken) {
          try {
            const graphResponse = await fetch(
              `https://graph.facebook.com/v18.0/me?fields=picture.type(large)&access_token=${providerToken}`
            );
            
            if (graphResponse.ok) {
              const graphData = await graphResponse.json();
              if (graphData?.picture?.data?.url) {
                profilePictureUrl = graphData.picture.data.url;
                console.log('Got picture URL from fields parameter');
              }
            }
          } catch (pictureError) {
            console.error('Failed to fetch profile picture from Facebook:', pictureError);
          }
        }
        
        // Update users table with Facebook data
        try {
          const { error: fbError } = await supabase
            .from('users')
            .update({
              facebook_access_token: providerToken,
              facebook_user_id: fbUserId,
              facebook_token_valid: true,
              facebook_token_updated_at: new Date().toISOString(),
              profile_picture_url: profilePictureUrl || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);
              
          if (fbError) {
            console.error('Error updating Facebook user data:', fbError);
          } else {
            console.log('Successfully saved Facebook data');
          }
        } catch (updateError) {
          console.error('Exception updating Facebook user data:', updateError);
        }
        
        // Store in auth_providers table as well
        try {
          // Check if an entry already exists
          const { data: existingProvider, error: checkError } = await supabase
            .from('auth_providers')
            .select('id')
            .eq('user_id', user.id)
            .eq('provider', 'facebook')
            .maybeSingle();
            
          if (!existingProvider) {
            // No record exists, create a new one
            await supabase
              .from('auth_providers')
              .insert({
                user_id: user.id,
                provider: 'facebook',
                provider_user_id: fbUserId,
                access_token: providerToken,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            console.log('Created auth_provider record for Facebook');
          } else {
            // Update existing record
            await supabase
              .from('auth_providers')
              .update({
                access_token: providerToken,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingProvider.id);
            console.log('Updated existing auth_provider record for Facebook');
          }
        } catch (providerError) {
          console.error('Error storing Facebook provider data:', providerError);
        }
      } catch (error) {
        console.error('Error processing Facebook data:', error);
      }
    };
    
    // Helper function to redirect based on profile status
    const redirectBasedOnProfileStatus = async (userId) => {
      try {
        console.log('Checking profile status for user:', userId);
        
        // First check if user record exists
        const { data: userExists, error: existsError } = await supabase
          .from('users')
          .select('id')
          .eq('id', userId)
          .single();
          
        // If user record doesn't exist, create one
        if (existsError || !userExists) {
          console.log('User record not found, creating initial record');
          await supabase.from('users').insert({
            id: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            hasprofile: false
          });
          
          console.log('Created initial user record, redirecting to profile setup');
          router.replace('/profile?setup=true&new=true');
          return;
        }
        
        // Check hasprofile status
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('hasprofile')
          .eq('id', userId)
          .single();
          
        if (userError) {
          console.error('Error checking user profile:', userError);
          router.replace('/profile?setup=true&error=check');
          return;
        }
        
        console.log('User profile status:', userData?.hasprofile);
        
        if (userData?.hasprofile) {
          console.log('User has profile, redirecting to dashboard');
          router.replace('/dashboard');
        } else {
          console.log('User needs to create profile, redirecting to create-profile');
          router.replace('/profile?setup=true');
        }
      } catch (error) {
        console.error('Error checking profile status:', error);
        
        // Check if error is related to Trestle
        const isTrestleError = 
          (error.message && error.message.includes('Trestle')) ||
          (error.error === 'invalid_request');
        
        if (isTrestleError) {
          console.log('Trestle-related error detected during profile check, continuing workflow');
          // Still redirect to profile setup but with a specific error code
          router.replace('/profile?setup=true&error=trestle_error');
        } else {
          router.replace('/profile?setup=true&error=exception');
        }
      }
    };
    
    handleAuthCallback();
  }, [router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="p-8 bg-white shadow-lg rounded-lg max-w-md w-full">
        {loading ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Processing your login...</p>
          </div>
        ) : error ? (
          <div className="text-red-500 text-center">
            <p>Error: {error}</p>
            {debugInfo.trestleTokenError && (
              <p className="mt-2 text-sm text-gray-600">
                Note: There was an issue connecting to property services.
                You can still proceed with basic account access.
              </p>
            )}
            <button 
              onClick={() => router.push('/login')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-gray-600">Redirecting...</p>
          </div>
        )}
      </div>
    </div>
  );
}