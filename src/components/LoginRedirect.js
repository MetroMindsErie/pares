import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/auth-context';

// This component handles redirection logic that was previously in the login page
export default function LoginRedirect() {
  const { isAuthenticated, hasprofile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect after auth has finished loading and user is authenticated
    if (!loading && isAuthenticated) {
      if (hasprofile === false) {
        router.push('/profile?setup=true');
      } else {
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, hasprofile, router, loading]);

  // This component doesn't render anything visible
  return null;
}
