import React from 'react';
import { useAuth } from '../context/auth-context';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import Head from 'next/head';

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
    <div className="min-h-screen">
      <Head>
        <title>Pares - Real Estate Network</title>
        <meta name="description" content="Connect and collaborate in real estate" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <Navbar 
        isAuthenticated={isAuthenticated}
        user={user}
        onLogout={handleLogout}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />
      
      {children}
      
      <Footer />
    </div>
  );
};

export default Layout;