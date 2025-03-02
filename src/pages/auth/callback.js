import { useEffect } from 'react';
import { useRouter } from 'next/router';
import supabase from '../../lib/supabase-setup';

const AuthCallback = () => {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session?.user) {
          // First check if user exists and get hasprofile status
          const { data: existingUser, error: userError } = await supabase
            .from('users')
            .select('hasprofile')
            .eq('id', session.user.id)
            .single();

          if (userError && userError.code === 'PGRST116') {
            // User doesn't exist, create new user
            await supabase
              .from('users')
              .insert({
                id: session.user.id,
                email: session.user.email,
                first_name: session.user.user_metadata?.full_name?.split(' ')[0] || '',
                last_name: session.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
                hasprofile: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            
            // Always redirect to profile setup for new users
            router.push('/profile?setup=true');
            return;
          }

          // Redirect based on hasprofile status
          if (!existingUser?.hasprofile) {
            router.push('/profile?setup=true');
          } else {
            router.push('/dashboard');
          }
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('Error in auth callback:', error);
        router.push('/login?error=callback-failed');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="text-center">
        <div className="spinner">Loading...</div>
        <p className="mt-4">Setting up your account...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
