import { useEffect } from 'react';
import { useRouter } from 'next/router';
import LoginForm from '../components/LoginForm';
import { useAuth } from '../context/auth-context';

export default function LoginPage() {
  const { isAuthenticated, hasProfile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If the user is authenticated, decide where to go
    if (isAuthenticated) {
      if (!hasProfile) {
        router.push('/profile?setup=true');
      } else {
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, hasProfile, router]);

  return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <LoginForm />
        </div>
      </div>
  );
}
