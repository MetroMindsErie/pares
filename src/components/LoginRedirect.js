import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/auth-context';
import supabase from '../lib/supabase-setup';

export default function LoginRedirect() {
  const { isAuthenticated, hasprofile, loading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const checkAndRedirect = async () => {
      // If auth is still loading, wait
      if (loading) return;
      
      // If authenticated according to context
      if (isAuthenticated) {
        console.log('User authenticated, checking profile status');
        
        // If hasprofile is already determined by context, use it
        if (hasprofile !== null) {
          if (hasprofile === false) {
            console.log('User needs to create profile (from context)');
            router.replace('/create-profile?setup=true');
          } else {
            console.log('User has profile (from context), redirecting to dashboard');
            router.replace('/dashboard');
          }
          return;
        }
        
        // If hasprofile is not determined, check it directly
        try {
          const { data, error } = await supabase
            .from('users')
            .select('hasprofile')
            .eq('id', user.id)
            .single();
          
          if (error) throw error;
          
          if (data?.hasprofile) {
            console.log('User has profile (from DB), redirecting to dashboard');
            router.replace('/dashboard');
          } else {
            console.log('User needs to create profile (from DB)');
            router.replace('/create-profile?setup=true');
          }
        } catch (err) {
          console.error('Error checking profile status:', err);
          // Default to profile creation on error
          router.replace('/create-profile?setup=true&error=true');
        }
      }
    };
    
    checkAndRedirect();
  }, [isAuthenticated, hasprofile, router, loading, user]);

  // This component doesn't render anything visible
  return null;
}
