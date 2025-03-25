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
      console.log('Processing auth callback (production)...');
      
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
        
        // Ensure that even on error we try to redirect to profile setup
        // This helps in production when specific errors shouldn't block signup flow
        try {
          console.log('Redirecting to profile setup despite error');
          router.replace('/create-profile?setup=true&recovery=true');
        } catch (routerErr) {
          console.error('Even router redirect failed:', routerErr);
          router.replace('/login?error=callback_error');
        }
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
        
        // Enhanced profile status check that also ensures basic profile fields exist
        await checkAndEnsureUserProfile(user.id);
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
        
        // CRITICAL: Default to profile creation if there's an error
        console.log('Error occurred, defaulting to profile creation');
        router.replace('/create-profile?setup=true&error=processing');
      }
    };
    
    // New helper function to check and ensure user profile completeness
    const checkAndEnsureUserProfile = async (userId) => {
      try {
        // Check if user has a complete profile with all required fields
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
          
        if (userError) {
          console.error('Error checking user profile:', userError);
          router.replace('/create-profile?setup=true&error=check');
          return;
        }
        
        // Check if crucial profile fields exist
        const hasRequiredFields = 
          userData.first_name && 
          userData.last_name && 
          userData.hasprofile === true;
        
        console.log('User profile status:', {
          hasprofile: userData.hasprofile,
          hasRequiredFields,
          firstName: !!userData.first_name,
          lastName: !!userData.last_name
        });
        
        if (hasRequiredFields) {
          console.log('User has complete profile, redirecting to dashboard');
          router.replace('/dashboard');
        } else {
          console.log('User needs to complete profile, redirecting to profile setup');
          router.replace('/create-profile?setup=true');
        }
      } catch (error) {
        console.error('Error in profile completeness check:', error);
        router.replace('/create-profile?setup=true&error=exception');
      }
    };
    
    // Helper function to process Facebook data
    const processFacebookData = async (user, fbUserId) => {
      try {
        console.log('Processing Facebook data for user:', user.id);
        setDebugInfo(prev => ({...prev, processingFacebook: true}));
        
        // Get tokens - try different sources
        const { data: { session } } = await supabase.auth.getSession();
        const providerToken = session?.provider_token || 
                             window.localStorage.getItem('provider_token') || 
                             null;
        
        if (!providerToken) {
          console.warn('No Facebook provider token available');
          return;
        }
        
        // Extract all available metadata
        const firstName = user.user_metadata?.full_name?.split(' ')[0] || '';
        const lastName = user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '';
        const email = user.email || '';
        const avatarUrl = user.user_metadata?.avatar_url || null;
        
        console.log('Extracted Facebook profile data:', { 
          firstName, 
          lastName, 
          email, 
          hasAvatar: !!avatarUrl,
          fbUserId
        });
        
        // Get additional data from Facebook API
        let additionalData = {};
        try {
          const fbResponse = await fetch(`https://graph.facebook.com/v19.0/me?fields=hometown,location,birthday&access_token=${providerToken}`);
          if (fbResponse.ok) {
            const fbData = await fbResponse.json();
            additionalData = {
              facebook_location: fbData.location?.name,
              facebook_hometown: fbData.hometown?.name,
              facebook_birthday: fbData.birthday
            };
            console.log('Retrieved additional Facebook data:', additionalData);
          }
        } catch (fbApiError) {
          console.warn('Could not fetch additional Facebook data:', fbApiError);
        }
        
        // Update users table with ALL Facebook data
        try {
          const { error: fbError } = await supabase
            .from('users')
            .update({
              facebook_access_token: providerToken,
              facebook_user_id: fbUserId,
              facebook_token_valid: true,
              facebook_token_updated_at: new Date().toISOString(),
              profile_picture_url: avatarUrl || null,
              // Make sure we're including these key fields
              first_name: firstName || null,
              last_name: lastName || null,
              email: email || null,
              // Include additional fields from Facebook
              ...additionalData,
              // Ensure these fields are set
              hasprofile: false, // Will be set to true after profile completion
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);
          
          if (fbError) {
            console.error('Error updating user with Facebook data:', fbError);
          } else {
            console.log('Successfully saved Facebook user data');
          }
        } catch (updateError) {
          console.error('Exception updating Facebook user data:', updateError);
        }
        
        // Store in auth_providers table for token management
        try {
          // Check if an entry already exists
          console.log('Attempting to store Facebook token in auth_providers');
          
          // Direct insert with error handling for 406 errors
          try {
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
          } catch (insertError) {
            // If insert fails, try update instead (don't query first)
            if (insertError.code === '406' || insertError.status === 406) {
              console.log('Insert failed with 406, trying update instead');
              try {
                await supabase
                  .from('auth_providers')
                  .update({
                    access_token: providerToken,
                    updated_at: new Date().toISOString()
                  })
                  .eq('user_id', user.id)
                  .eq('provider', 'facebook');
                console.log('Updated auth_provider record using direct update');
              } catch (updateError) {
                console.warn('Both insert and update failed for auth_providers', updateError);
                // Continue flow even if both attempts failed
              }
            } else {
              console.warn('Insert to auth_providers failed with non-406 error', insertError);
            }
          }
        } catch (providerError) {
          console.error('Error storing Facebook provider data:', providerError);
          // Allow flow to continue even if auth_providers operations fail
        }
      } catch (error) {
        console.error('Error processing Facebook data:', error);
        // Allow flow to continue even if Facebook data processing fails
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
          router.replace('/create-profile?setup=true&new=true');
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
          // IMPORTANT: When in doubt, redirect to profile setup
          console.log('Error checking profile status, defaulting to profile setup');
          router.replace('/create-profile?setup=true&error=check');
          return;
        }
        
        console.log('User profile status:', userData?.hasprofile);
        
        if (userData?.hasprofile) {
          console.log('User has profile, redirecting to dashboard');
          router.replace('/dashboard');
        } else {
          console.log('User needs to create profile, redirecting to profile setup');
          router.replace('/create-profile?setup=true');
        }
      } catch (error) {
        console.error('Error checking profile status:', error);
        
        // CRITICAL FIX: Default to profile setup on ANY error
        // This ensures new Facebook users always go to profile creation
        console.log('Exception in profile check, defaulting to profile setup');
        router.replace('/create-profile?setup=true&error=exception');
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