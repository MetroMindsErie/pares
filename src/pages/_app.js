import React, { useEffect } from 'react';
import { initClient } from '../lib/setup-client';
import '../styles/globals.css';
import '../styles/propertyTemplates.css';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthProvider } from '../context/auth-context';
import supabase from '../lib/supabase-setup';
import RoleSaver from '../components/Profile/RoleSaver';
import AnalyticsProvider from '../components/AnalyticsProvider';

function SafeHydrate({ children }) {
  return (
    <div suppressHydrationWarning>
      {typeof window === 'undefined' ? null : children}
    </div>
  );
}

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    // Initialize client on app load
    initClient().catch(console.error);

    // Global session restoration for auth state persistence
    const checkSession = async () => {
      // Only run on client side
      if (typeof window === 'undefined') return;
      
      try {
        // This will refresh the session if needed
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session restoration error:', error);
        } else if (data?.session?.user) {
          console.log('Session restored for user:', data.session.user.id);
          
          // Ensure user record exists in database
          try {
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('id')
              .eq('id', data.session.user.id)
              .maybeSingle();
              
            if (userError || !userData) {
              console.log('Creating user record for authenticated user');
              await supabase
                .from('users')
                .insert({
                  id: data.session.user.id,
                  email: data.session.user.email,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  hasprofile: false
                });
            }
          } catch (err) {
            console.error('Error checking/creating user record:', err);
          }
        }
      } catch (err) {
        console.error('Session check error:', err);
      }
    };
    
    checkSession();
    
    // Clean up all flags that could cause loops
    if (typeof window !== 'undefined') {
      // Only clear flags if not on these specific pages
      if (!['/create-profile', '/profile'].includes(window.location.pathname)) {
        sessionStorage.removeItem('selectedRoles');
        sessionStorage.removeItem('expectedRoles');
        sessionStorage.removeItem('dashboardLoadCount');
      }
    }
  }, []);

  // Use the layout defined at the page level, if available
  const getLayout = Component.getLayout || ((page) => page);
  
  // Determine if this is an auth page that needs special handling
  const isAuthPage = ['/login', '/register', '/create-profile'].includes(
    typeof window !== 'undefined' ? window.location.pathname : ''
  );

  return (
    <AuthProvider>
      <AnalyticsProvider>
        {/* Only render RoleSaver on specific paths and only once per session */}
        {typeof window !== 'undefined' && 
         window.location.pathname === '/dashboard' && 
         !sessionStorage.getItem('roleSaverRendered') && (
          <>
            <RoleSaver />
            {/* Mark that RoleSaver has rendered to prevent duplicates */}
            {sessionStorage.setItem('roleSaverRendered', 'true')}
          </>
        )}
        <ErrorBoundary>
          {isAuthPage ? (
            <SafeHydrate>
              {getLayout(<Component {...pageProps} />)}
            </SafeHydrate>
          ) : (
            getLayout(<Component {...pageProps} />)
          )}
        </ErrorBoundary>
      </AnalyticsProvider>
    </AuthProvider>
  );
}

export default MyApp;
