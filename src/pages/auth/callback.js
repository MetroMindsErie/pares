import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // Handle auth callback
    const handleCallback = async () => {
      try {
        console.log('Processing OAuth callback...');
        
        const { default: supabase } = await import('../../utils/supabaseClient');
        
        // Let Supabase handle the auth session
        const { error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting auth session:', error);
          router.push('/login?error=auth-callback-failed');
        } else {
          console.log('Successfully authenticated');
          router.push('/profile?setup=true');
        }
      } catch (err) {
        console.error('Error in auth callback:', err);
        router.push('/login?error=unknown-callback-error');
      }
    };

    handleCallback();
  }, [router]);

  // Show a loading state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Completing authentication...
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please wait while we complete the sign-in process.
          </p>
        </div>
        <div className="flex justify-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    </div>
  );
}