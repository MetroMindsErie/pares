import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { storeProviderData } from '../../services/auth/auth-service';

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Processing auth callback...');
        
        // Import supabase client dynamically to avoid SSR issues
        const { default: supabase } = await import('../../lib/supabase-setup');
        
        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setError('Authentication session error');
          router.push('/login?error=session');
          return;
        }
        
        if (!session) {
          console.error('No session found in callback');
          setError('No authentication session found');
          router.push('/login?error=no-session');
          return;
        }
        
        console.log('Auth provider:', session.user.app_metadata?.provider);
        
        // Store provider data (especially important for Facebook)
        if (session.user.app_metadata?.provider) {
          const { error: providerError } = await storeProviderData(session);
          if (providerError) {
            console.error('Error storing provider data:', providerError);
          }
        }
        
        // Check if user exists in users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, hasprofile')
          .eq('id', session.user.id)
          .single();
        
        if (userError) {
          console.error('User data error:', userError);
          
          // If the user doesn't exist in our users table yet, create them
          if (userError.code === 'PGRST116') {
            console.log('Creating new user record');
            try {
              await supabase.from('users').insert({
                id: session.user.id,
                email: session.user.email,
                first_name: session.user.user_metadata?.full_name?.split(' ')[0] || '',
                last_name: session.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
                avatar_url: session.user.user_metadata?.avatar_url,
                hasprofile: false,
                created_at: new Date().toISOString()
              });
              
              // Redirect to profile setup
              router.push('/profile?setup=true');
              return;
            } catch (createError) {
              console.error('Error creating user:', createError);
              setError('Failed to create user record');
              return;
            }
          }
          
          // For other errors, redirect to profile setup as fallback
          router.push('/profile?setup=true');
          return;
        }

        // Redirect based on profile status
        if (userData?.hasprofile) {
          console.log('User has profile, redirecting to dashboard');
          router.push('/dashboard');
        } else {
          console.log('User needs to complete profile setup');
          router.push('/profile?setup=true');
        }
      } catch (error) {
        console.error("Error in auth callback:", error);
        setError('Authentication callback error');
        router.push('/login?error=callback');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-xl font-medium">Completing authentication...</h1>
        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
        <div className="mt-4 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    </div>
  );
}