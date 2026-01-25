import React from 'react';
import { useRouter } from 'next/router';
import Navbar from './Navbar';
import Footer from './Footer';
import Head from 'next/head';
import { useAuth } from '../context/auth-context';

const Layout = ({ children }) => {
  const router = useRouter();

  const { user, isAuthenticated, authChecked, logout } = useAuth();

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
      <Head>
        <title>Pares - Real Estate Network</title>
        <meta name="description" content="Connect and collaborate in real estate" />
        <link rel="icon" href="/paresfinal.jpg" />
      </Head>
      
      <Navbar 
        isAuthenticated={!!isAuthenticated}
        user={user}
        onLogout={handleLogout}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />
      
      {!authChecked ? <div>Loading...</div> : children}
      
      <Footer />
    </div>
  );
};

export default Layout;