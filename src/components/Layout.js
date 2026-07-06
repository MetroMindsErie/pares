import React from 'react';
import { useRouter } from 'next/router';
import Navbar from './Navbar';
import Footer from './Footer';
import { useAuth } from '../context/auth-context';

// Only these routes need the auth check to finish before content shows.
// Public pages must render immediately — server-rendered HTML is what
// search engines index (this used to gate EVERY page behind "Loading...").
const AUTH_GATED_PREFIXES = ['/dashboard', '/profile', '/saved-properties', '/create-profile', '/admin'];

const Layout = ({ children }) => {
  const router = useRouter();

  const { user, isAuthenticated, authChecked, logout } = useAuth();
  const isAuthGated = AUTH_GATED_PREFIXES.some((p) => router.pathname.startsWith(p));

  const handleLogout = async () => {
    try {
      await logout();
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




  return (
    <div className="min-h-screen">
      {/* Default title/meta live in _app.js so page-level <Head> always wins.
          (Layout renders inside some pages, so a <Head> here would override theirs.) */}
      <Navbar
        isAuthenticated={!!isAuthenticated}
        user={user}
        onLogout={handleLogout}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />
      
      {isAuthGated && !authChecked ? <div>Loading...</div> : children}
      
      <Footer />
    </div>
  );
};

export default Layout;