import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import supabase from '../../lib/supabase-setup';
import { useAuth } from '../../context/auth-context'; // Import the auth context

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState({});
  const { refreshUserData, getRedirectPath } = useAuth(); // Use auth context

    // Read OAuth error/code from BOTH the query string and the URL hash —
    // Supabase uses either depending on flow/provider.
    const readAuthParams = () => {
      const out = {};
      try {
        const q = new URLSearchParams(window.location.search);
        const h = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
        for (const src of [q, h]) {
          for (const k of ['error', 'error_code', 'error_description', 'code']) {
            if (!out[k] && src.get(k)) out[k] = src.get(k);
          }
        }
      } catch { /* ignore */ }
      return out;
    };

    // Get the session, retrying briefly while detectSessionInUrl / PKCE exchange finishes.
    const resolveSession = async (hasCode) => {
      for (let attempt = 0; attempt < 4; attempt++) {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session) return { session };
        if (error) return { error };

        // PKCE: if a code is present but no session yet, exchange it explicitly.
        if (hasCode && attempt === 0) {
          try {
            const { data, error: exErr } = await supabase.auth.exchangeCodeForSession(window.location.href);
            if (data?.session) return { session: data.session };
            if (exErr && !/code verifier|already/i.test(exErr.message || '')) {
              return { error: exErr };
            }
          } catch (e) {
            // fall through to retry loop
          }
        }
        await new Promise(r => setTimeout(r, 400));
      }
      return { session: null };
    };

  useEffect(() => {
    const handleAuthCallback = async () => {
      setLoading(true);

      try {
        // 1) Surface a provider/Supabase error instead of silently bouncing to login.
        const params = readAuthParams();
        if (params.error) {
          const friendly = decodeURIComponent(params.error_description || params.error).replace(/\+/g, ' ');
          console.error('OAuth returned an error:', params);
          setError(friendly);
          setDebugInfo(prev => ({ ...prev, oauthError: params }));
          setLoading(false);
          return; // stay on this page and show the message + retry button
        }

        // 2) Resolve the session (with PKCE exchange + short retry).
        const { session, error: sessionError } = await resolveSession(Boolean(params.code));

        if (sessionError) {
          console.error('Session error in callback:', sessionError);
          setDebugInfo(prev => ({...prev, sessionError: sessionError.message}));
          throw sessionError;
        }

        if (!session) {
          console.error('No session found after all attempts');
          setError('We could not complete your sign-in. Please try again.');
          setLoading(false);
          return;
        }

        const { user } = session;

        await processAuthenticatedUser(user);

      } catch (err) {
        console.error('Error in auth callback:', err);
        
        setError(err.message || 'Authentication callback failed');
        setDebugInfo(prev => ({...prev, callbackError: err.message}));
        
        // On general callback error, check profile before defaulting to create-profile
        try {
          const { data: { session: recoverySession } } = await supabase.auth.getSession();
          if (recoverySession?.user?.id) {
            const { data: recoveryProfile } = await supabase
              .from('users')
              .select('hasprofile')
              .eq('id', recoverySession.user.id)
              .maybeSingle();
            if (recoveryProfile?.hasprofile === true) {
              router.replace('/dashboard');
              return;
            }
          }
          router.replace('/create-profile?setup=true&recovery=true');
        } catch (routerErr) {
          console.error('Even router redirect failed:', routerErr);
          router.replace('/login?error=callback_error');
        }
      } finally {
        setLoading(false);
      }
    };
    
    // Make sure the new user has a row in `users` before we check their profile,
    // so brand-new Google/Facebook accounts don't fall through to an error path.
    const ensureUserRow = async (user) => {
      try {
        const { data: existing } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();
        if (existing) return;

        await supabase.from('users').insert({
          id: user.id,
          email: user.email,
          first_name: user.user_metadata?.full_name?.split(' ')[0] || user.user_metadata?.name?.split(' ')[0] || null,
          last_name: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || null,
          profile_picture_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          hasprofile: false,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } catch (err) {
        // A duplicate (row created concurrently) is fine; anything else we log and continue.
        if (err?.code !== '23505') console.warn('ensureUserRow (callback):', err?.message || err);
      }
    };

    // Extracted the authenticated user processing to a separate function
    const processAuthenticatedUser = async (user) => {
      if (!user) {
        router.replace('/login');
        return;
      }

      try {
        await ensureUserRow(user);

        // Check if we have provider data
        const provider = user.app_metadata?.provider;
        if (provider) {

          setDebugInfo(prev => ({...prev, provider}));
          
          // Store provider-specific information
          const identities = user.identities || [];
          const identity = identities.find(i => i.provider === provider);
          
          if (identity) {

            setDebugInfo(prev => ({...prev, identityId: identity.id}));
            
            // Process Facebook data if needed
            if (provider === 'facebook') {
              await processFacebookData(user, identity.id);
            }
          }
        }
        
        // Update user data in auth context
        await refreshUserData(user.id);
        
        // Always use direct DB check for redirect — getRedirectPath() may
        // see stale React state since refreshUserData triggers async setState.
        await checkProfileStatusAndRedirect(user.id);
      } catch (err) {
        console.error('Error processing authenticated user:', err);
        
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
        
        // Don't blindly send to create-profile — check if user has a profile first
        try {
          const { data: profileCheck } = await supabase
            .from('users')
            .select('hasprofile')
            .eq('id', user.id)
            .maybeSingle();
          if (profileCheck?.hasprofile === true) {
            router.replace('/dashboard');
            return;
          }
        } catch (_) { /* fall through to create-profile */ }

        router.replace('/create-profile?setup=true&error=processing');
      }
    };
    
    // New simplified function that checks profile status and redirects
    const checkProfileStatusAndRedirect = async (userId) => {
      try {

        
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('hasprofile, first_name, last_name, city')
          .eq('id', userId)
          .maybeSingle();

        if (userError) {
          console.error('Error checking profile status:', userError);
          router.replace('/create-profile?setup=true&error=check');
          return;
        }

        if (userData && userData.hasprofile === true) {

          router.replace('/dashboard');
        } else if (userData?.first_name && userData?.last_name && userData?.city) {
          // Profile fields exist but hasprofile is false — self-heal
          console.warn('hasprofile was false but profile data exists — repairing');
          await supabase
            .from('users')
            .update({ hasprofile: true, updated_at: new Date().toISOString() })
            .eq('id', userId);
          router.replace('/dashboard');
        } else {

          router.replace('/create-profile?setup=true');
        }
      } catch (error) {
        console.error('Exception in profile status check:', error);
        router.replace('/create-profile?setup=true&error=exception');
      }
    };
    
    // Helper function to process Facebook data
    const processFacebookData = async (user, fbUserId) => {
      try {

        setDebugInfo(prev => ({...prev, processingFacebook: true}));
        
        const { data: { session } } = await supabase.auth.getSession();
        const providerToken = session?.provider_token || 
                             window.localStorage.getItem('provider_token') || 
                             null;
        
        if (!providerToken) {
          console.warn('No Facebook provider token available');
          return;
        }
        
        const firstName = user.user_metadata?.full_name?.split(' ')[0] || '';
        const lastName = user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '';
        const email = user.email || '';
        const avatarUrl = user.user_metadata?.avatar_url || null;
        
        ('Extracted Facebook profile data:', { 
          firstName, 
          lastName, 
          email, 
          hasAvatar: !!avatarUrl,
          fbUserId
        });
        
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

          }
        } catch (fbApiError) {
          console.warn('Could not fetch additional Facebook data:', fbApiError);
        }
        
        try {
          // First check if the user already has a profile to avoid
          // resetting hasprofile on returning Facebook logins
          const { data: existingUser } = await supabase
            .from('users')
            .select('hasprofile, first_name')
            .eq('id', user.id)
            .maybeSingle();

          const updatePayload = {
            facebook_access_token: providerToken,
            facebook_user_id: fbUserId,
            facebook_token_valid: true,
            facebook_token_updated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...additionalData,
          };

          // Only populate profile fields if the user doesn't have them yet
          if (!existingUser?.first_name) {
            updatePayload.profile_picture_url = avatarUrl || null;
            updatePayload.first_name = firstName || null;
            updatePayload.last_name = lastName || null;
            updatePayload.email = email || null;
          }

          // Never overwrite hasprofile if it's already true
          if (!existingUser || existingUser.hasprofile !== true) {
            updatePayload.hasprofile = false;
          }

          const { error: fbError } = await supabase
            .from('users')
            .update(updatePayload)
            .eq('id', user.id);
          
          if (fbError) {
            console.error('Error updating user with Facebook data:', fbError);
          } else {

          }
        } catch (updateError) {
          console.error('Exception updating Facebook user data:', updateError);
        }
        
        try {

          
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

          } catch (insertError) {
            if (insertError.code === '406' || insertError.status === 406) {

              try {
                await supabase
                  .from('auth_providers')
                  .update({
                    access_token: providerToken,
                    updated_at: new Date().toISOString()
                  })
                  .eq('user_id', user.id)
                  .eq('provider', 'facebook');

              } catch (updateError) {
                console.warn('Both insert and update failed for auth_providers', updateError);
              }
            } else {
              console.warn('Insert to auth_providers failed with non-406 error', insertError);
            }
          }
        } catch (providerError) {
          console.error('Error storing Facebook provider data:', providerError);
        }
      } catch (error) {
        console.error('Error processing Facebook data:', error);
      }
    };
    
    handleAuthCallback();
  }, [router, refreshUserData, getRedirectPath]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="p-8 bg-white shadow-lg rounded-lg max-w-md w-full">
        {loading ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Processing your login...</p>
          </div>
        ) : error ? (
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">We couldn&apos;t finish signing you in</h2>
            <p className="mt-2 text-sm text-gray-600">{error}</p>
            {debugInfo.trestleTokenError && (
              <p className="mt-2 text-sm text-gray-600">
                Note: There was an issue connecting to property services.
                You can still proceed with basic account access.
              </p>
            )}
            <button
              onClick={() => router.push('/login')}
              className="mt-5 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              Back to Sign In
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