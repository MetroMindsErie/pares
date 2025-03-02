import { useAuth } from '../context/auth-context';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Navbar from './Navbar';

const Layout = ({ children }) => {
  const { isAuthenticated, loading, user, signOut } = useAuth();
  const router = useRouter();

  // Add console log for debugging
  useEffect(() => {
    console.log('Layout loading state:', loading);
    console.log('Layout auth state:', isAuthenticated);
  }, [loading, isAuthenticated]);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleLogin = () => {
    router.push('/login');
  };

  const handleRegister = () => {
    router.push('/register');
  };

  // Only show loading spinner for a maximum of 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.log('Forcing loading state to false after timeout');
        // Force render content after timeout
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
          mainContent.style.display = 'block';
        }
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [loading]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar 
        isAuthenticated={isAuthenticated}
        user={user}
        onLogout={handleLogout}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <main className="flex-1 pt-16">
          {children}
        </main>
      )}
    </div>
  );
};

export default Layout;