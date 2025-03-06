import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Import Supabase client
        const { default: supabaseClient } = await import('../../utils/supabaseClient');
        
        // Process the auth callback
        const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        if (!sessionData?.session) {
          console.log('No session found, redirecting to login');
          router.push('/login');
          return;
        }
        
        const { user: authUser } = sessionData.session;
        console.log('Auth callback: User authenticated', authUser.id);
        
        // Check if user has completed their profile
        const { data, error } = await supabaseClient
          .from('users')
          .select('hasprofile')
          .eq('id', authUser.id)
          .single();

        if (error) {
          console.error('Error fetching user profile:', error);
          // Default to profile creation on error
          router.push('/profile?setup=true');
          return;
        }

        // Redirect based on profile status
        if (data && data.hasprofile) {
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

  // Show a simple loading state
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