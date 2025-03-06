import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/auth-context';

export default function AuthCallback() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Import Supabase client
        const { default: supabaseClient } = await import('../../utils/supabaseClient');
        
        // Process the auth callback - this is important for OAuth flows
        const { data, error } = await supabaseClient.auth.getSession();
        
        if (error) {
          throw error;
        }

        // If we have a session but no user context yet, wait briefly
        if (data?.session && !user) {
          console.log("Session found but waiting for user context to update");
          setTimeout(() => checkUserProfile(), 1000);
          return;
        }
        
        checkUserProfile();
      } catch (error) {
        console.error("Error in auth callback:", error);
        router.push('/login?error=callback');
      }
    };

    const checkUserProfile = async () => {
      try {
        const { default: supabaseClient } = await import('../../utils/supabaseClient');
        
        // Get current user
        const { data: { user: authUser } } = await supabaseClient.auth.getUser();
        
        if (!authUser) {
          console.log("No user found, redirecting to login");
          router.push('/login');
          return;
        }

        // Check if user has completed their profile
        const { data, error } = await supabaseClient
          .from('users')
          .select('hasProfile')
          .eq('id', authUser.id)
          .single();

        if (error) throw error;

        if (data && data.hasProfile) {
          console.log("User has profile, redirecting to dashboard");
          router.push('/dashboard');
        } else {
          console.log("User needs to complete profile setup");
          router.push('/profile?setup=true');
        }
      } catch (error) {
        console.error("Error checking user profile:", error);
        router.push('/profile?setup=true');
      }
    };

    handleAuthCallback();
  }, [router, user]);

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