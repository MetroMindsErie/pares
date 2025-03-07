import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { storeProviderData, getCurrentUser } from '../../services/auth/auth-service';

export default function AuthCallback() {
  const router = useRouter();

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
          router.push('/login?error=session');
          return;
        }
        
        if (!session) {
          console.error('No session found in callback');
          router.push('/login?error=no-session');
          return;
        }
        
        console.log('Auth provider:', session.user.app_metadata?.provider);
        
        // Store provider data (especially important for Facebook)
        if (session.user.app_metadata?.provider) {
          await storeProviderData(session);
        }
        
        // Check if user has a profile
        const { user, error: userError } = await getCurrentUser();
        
        if (userError) {
          console.error('Error getting user data:', userError);
          router.push('/profile?setup=true');
          return;
        }

        // Redirect based on profile status
        if (user?.hasprofile) {
          console.log('User has profile, redirecting to dashboard');
          router.push('/dashboard');
        } else {
          console.log('User needs to complete profile setup');
          router.push('/profile?setup=true');
        }
      } catch (error) {
        console.error("Error in auth callback:", error);
        router.push('/login?error=callback');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-xl font-medium">Completing authentication...</h1>
        <div className="mt-4 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    </div>
  );
}