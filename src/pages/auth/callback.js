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
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        // If no session, redirect to login
        if (!session) {
          console.error('No session found in callback');
          router.replace('/login');
          return;
        }
        
        const { user } = session;
        console.log('Auth callback processing for user:', user.id);
        
        // Check if we have provider data
        const provider = user.app_metadata?.provider;
        if (!provider) {
          console.log('No provider found in user metadata');
          redirectBasedOnProfileStatus(user.id);
          return;
        }
        
        console.log('Processing provider:', provider);
        setDebugInfo(prev => ({...prev, provider}));
        
        // Store provider-specific information
        const identities = user.identities || [];
        const identity = identities.find(i => i.provider === provider);
        
        if (!identity) {
          console.error('No identity found for provider:', provider);
          redirectBasedOnProfileStatus(user.id);
          return;
        }
        
        console.log('Found identity:', identity.id);
        setDebugInfo(prev => ({...prev, identityId: identity.id}));
        
        // Get the tokens - try different methods to ensure we get them
        const providerToken = session.provider_token || 
                             window.localStorage.getItem('provider_token') || 
                             null;
                             
        // Store in auth_providers table - check first if record exists
        try {
          // Check if an entry already exists
          const { data: existingProvider, error: checkError } = await supabase
            .from('auth_providers')
            .select('id')
            .eq('user_id', user.id)
            .eq('provider', provider)
            .maybeSingle();
            
          if (checkError) {
            console.error('Error checking for existing provider record:', checkError);
          }
          
          if (!existingProvider) {
            // No record exists, create a new one
            const { error: insertError } = await supabase
              .from('auth_providers')
              .insert({
                user_id: user.id,
                provider: provider,
                provider_user_id: identity.id,
                access_token: providerToken,
                refresh_token: session.provider_refresh_token || null,
                token_expiry: session.expires_at 
                  ? new Date(session.expires_at * 1000).toISOString()
                  : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
                
            if (insertError) {
              console.error('Error creating provider record:', insertError);
              setDebugInfo(prev => ({...prev, providerError: insertError.message}));
            } else {
              console.log('Successfully created provider record');
              setDebugInfo(prev => ({...prev, providerSuccess: true}));
            }
          } else {
            // Record exists, update it
            const { error: updateError } = await supabase
              .from('auth_providers')
              .update({
                access_token: providerToken,
                refresh_token: session.provider_refresh_token || null,
                token_expiry: session.expires_at 
                  ? new Date(session.expires_at * 1000).toISOString()
                  : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', existingProvider.id);
            
            if (updateError) {
              console.error('Error updating provider record:', updateError);
              setDebugInfo(prev => ({...prev, providerUpdateError: updateError.message}));
            } else {
              console.log('Successfully updated provider record');
              setDebugInfo(prev => ({...prev, providerUpdateSuccess: true}));
            }
          }
        } catch (storeError) {
          console.error('Exception storing provider data:', storeError);
          setDebugInfo(prev => ({...prev, providerStoreException: storeError.message}));
        }
        
        // Special handling for Facebook
        if (provider === 'facebook') {
          console.log('Processing Facebook-specific data...');
          
          // Save the token for debug purposes
          setDebugInfo(prev => ({
            ...prev, 
            hasProviderToken: !!providerToken,
            providerTokenFirstChars: providerToken ? providerToken.substring(0, 10) + '...' : null
          }));
          
          // Execute Facebook data processing
          await processFacebookData(user, identity.id, providerToken);
        }
        
        // Check profile status and redirect accordingly
        await redirectBasedOnProfileStatus(user.id);
        
      } catch (err) {
        console.error('Error in auth callback:', err);
        setError(err.message);
        setDebugInfo(prev => ({...prev, callbackError: err.message}));
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    };
    
    // Helper function to process Facebook data
    const processFacebookData = async (user, fbUserId, accessToken) => {
      if (!accessToken) {
        console.warn('No Facebook access token available');
        return;
      }
      
      try {
        console.log('Processing Facebook data with token');
        setDebugInfo(prev => ({...prev, processingFacebook: true}));
        
        // Get profile picture from Facebook
        let profilePictureUrl = user.user_metadata?.avatar_url || null;
        
        // If no picture in metadata, try to fetch from Facebook
        if (!profilePictureUrl) {
          try {
            // Method 1: Try direct picture endpoint
            try {
              const pictureResponse = await fetch(
                `https://graph.facebook.com/${fbUserId}/picture?type=large&redirect=false&access_token=${accessToken}`
              );
              
              if (pictureResponse.ok) {
                const pictureData = await pictureResponse.json();
                if (pictureData?.data?.url) {
                  profilePictureUrl = pictureData.data.url;
                  console.log('Got picture URL from direct endpoint:', profilePictureUrl);
                }
              }
            } catch (pictureError) {
              console.error('Error fetching picture from direct endpoint:', pictureError);
            }
            
            // Method 2: Try fields parameter if method 1 failed
            if (!profilePictureUrl) {
              const graphResponse = await fetch(
                `https://graph.facebook.com/v18.0/me?fields=picture.type(large)&access_token=${accessToken}`
              );
              
              if (graphResponse.ok) {
                const graphData = await graphResponse.json();
                if (graphData?.picture?.data?.url) {
                  profilePictureUrl = graphData.picture.data.url;
                  console.log('Got picture URL from fields parameter:', profilePictureUrl);
                }
              }
            }
          } catch (pictureError) {
            console.error('Failed to fetch profile picture from Facebook:', pictureError);
          }
        }
        
        setDebugInfo(prev => ({
          ...prev, 
          fbPictureUrl: profilePictureUrl ? 'Found picture URL' : 'No picture URL'
        }));
        
        // Update users table with Facebook data - with explicit error handling
        try {
          const { data: updateData, error: fbError } = await supabase
            .from('users')
            .update({
              facebook_access_token: accessToken,
              facebook_user_id: fbUserId,
              facebook_token_valid: true,
              facebook_token_updated_at: new Date().toISOString(),
              profile_picture_url: profilePictureUrl || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);
              
          if (fbError) {
            console.error('Error updating Facebook user data:', fbError);
            setDebugInfo(prev => ({...prev, fbUpdateError: fbError.message}));
          } else {
            console.log('Successfully saved Facebook data');
            setDebugInfo(prev => ({...prev, fbUpdateSuccess: true}));
          }
        } catch (updateError) {
          console.error('Exception updating Facebook user data:', updateError);
          setDebugInfo(prev => ({...prev, fbUpdateException: updateError.message}));
        }
        
        // Also try using admin API as a fallback if needed
        if (process.env.NEXT_PUBLIC_USE_ADMIN_API === 'true') {
          try {
            const response = await fetch('/api/auth/store-facebook-token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                user_id: user.id,
                access_token: accessToken,
                provider_user_id: fbUserId
              }),
            });
            
            if (response.ok) {
              console.log('Successfully saved Facebook data via API');
              setDebugInfo(prev => ({...prev, apiUpdateSuccess: true}));
            } else {
              console.error('Error saving Facebook data via API:', await response.text());
            }
          } catch (apiError) {
            console.error('Exception calling Facebook token API:', apiError);
          }
        }
      } catch (error) {
        console.error('Error processing Facebook data:', error);
        setDebugInfo(prev => ({...prev, fbProcessingError: error.message}));
      }
    };
    
    // Helper function to redirect based on profile status
    const redirectBasedOnProfileStatus = async (userId) => {
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('hasprofile')
          .eq('id', userId)
          .single();
          
        if (userError) {
          console.error('Error checking user profile:', userError);
          router.replace('/create-profile');
          return;
        }
        
        console.log('User profile status:', userData?.hasprofile);
        
        if (userData?.hasprofile) {
          console.log('User has profile, redirecting to dashboard');
          router.replace('/dashboard');
        } else {
          console.log('User needs to create profile, redirecting to create-profile');
          router.replace('/create-profile');
        }
      } catch (error) {
        console.error('Error checking profile status:', error);
        router.replace('/create-profile');
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