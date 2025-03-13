import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Navbar from './Navbar';
import Footer from './Footer';
import Head from 'next/head';
import { supabase } from '../utils/supabaseClient';

const Layout = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    // Check for existing session on component mount
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Set up auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change in Layout:', event);
        setUser(session?.user || null);
        setLoading(false);
      }
    );

    // Cleanup
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
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

  console.log('Layout loading state:', loading);
  console.log('Layout auth state:', !!user);

  return (
    <div className="min-h-screen">
      <Head>
        <title>Pares - Real Estate Network</title>
        <meta name="description" content="Connect and collaborate in real estate" />
        <link rel="icon" href="/paresfinal.jpg" />
      </Head>
      
      <Navbar 
        isAuthenticated={!!user}
        user={user}
        onLogout={handleLogout}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />
      
      {loading ? <div>Loading...</div> : children}
      
      <Footer />
    </div>
  );
};

export default Layout;