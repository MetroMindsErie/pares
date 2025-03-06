import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/auth-context';

// This component handles redirection logic for the register page
export default function RegisterRedirect() {
  const { isAuthenticated, hasProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect after auth has finished loading and user is authenticated
    if (!loading && isAuthenticated) {
      if (hasProfile === false) {
        router.push('/profile?setup=true');
      } else {
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, hasProfile, router, loading]);

  // This component doesn't render anything visible
  return null;
}
