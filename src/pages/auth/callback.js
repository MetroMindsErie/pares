import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/auth-context';
import supabase from '../../lib/supabase-setup';
import axios from 'axios';

export default function AuthCallback() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('Processing authentication...');
  
  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the current user session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          console.log('No authenticated user found');
          setStatus('No authenticated user found. Redirecting to login...');
          setTimeout(() => router.push('/login'), 2000);
          return;
        }

        const user = session.user;
        console.log('User authenticated:', user.id);
        
        // IMPORTANT: Create user record if it doesn't exist yet
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .single();
          
        if (checkError || !existingUser) {
          console.log('Creating new user record in users table');
          // Create basic user record
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: user.id,
              email: user.email,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              // Set other required fields with default values
              profile_type_id: 1, // Default profile type
              hasprofile: false // Will be set to true after profile setup
            });
            
          if (insertError) {
            console.error('Error creating user record:', insertError);
          }
        }

        // Check if this was a Facebook login
        const isFacebookAuth = router.query.provider === 'facebook' || 
                               user.app_metadata?.provider === 'facebook';
        
        if (isFacebookAuth) {
          setStatus('Processing Facebook authentication...');
          console.log('Facebook authentication detected');
          
          // Get Facebook provider ID from metadata
          const fbUserId = user.user_metadata?.provider_id || 
                            user.identities?.find(id => id.provider === 'facebook')?.id;
          
          // Get Facebook access token (it's actually in the provider_token of the session)
          let fbToken = session.provider_token;
          
          if (fbToken) {
            console.log('Found Facebook provider_token, saving to database');
            setStatus('Saving Facebook token...');
            
            try {
              // Update both tables at once
              const updates = await Promise.all([
                // Update users table
                supabase.from('users')
                  .update({
                    facebook_access_token: fbToken,
                    facebook_user_id: fbUserId,
                    facebook_token_updated_at: new Date().toISOString(),
                    facebook_token_valid: true
                  })
                  .eq('id', user.id),
                
                // Update auth_providers table
                supabase.from('auth_providers')
                  .upsert({
                    user_id: user.id,
                    provider: 'facebook',
                    provider_user_id: fbUserId,
                    access_token: fbToken,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  })
              ]);
              
              console.log('Facebook token saved to both tables');
            } catch (tokenError) {
              console.error('Error saving Facebook token:', tokenError);
            }
          } else {
            console.log('No Facebook token found in session');
          }
        }
        
        // Check if user profile exists
        setStatus('Checking profile...');
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('hasprofile')
          .eq('id', session.user.id)
          .single();
          
        if (userError) {
          console.error('Error checking profile:', userError);
          throw new Error('Failed to check profile');
        }
        
        // Redirect based on profile status
        if (userData?.hasprofile) {
          setStatus('Profile found. Redirecting to dashboard...');
          router.push('/dashboard');
        } else {
          setStatus('Profile setup needed. Redirecting...');
          router.push('/profile?setup=true');
        }
      } catch (error) {
        console.error('Error in auth callback:', error);
        setError(error.message || 'Authentication error');
      }
    };
    
    if (router.isReady) {
      handleCallback();
    }
  }, [router.isReady, router.query.provider, router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
        {error ? (
          <>
            <div className="text-red-500 text-xl mb-4">⚠️ Authentication Error</div>
            <p className="text-gray-700 mb-6">{error}</p>
            <button
              onClick={() => router.push('/login')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              Return to Login
            </button>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
            <h1 className="text-xl font-medium">Authentication in progress</h1>
            <p className="mt-4 text-gray-500">{status}</p>
          </>
        )}
      </div>
    </div>
  );
}
