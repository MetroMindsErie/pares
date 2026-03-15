import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { initClient } from '../lib/setup-client';
import 'leaflet/dist/leaflet.css';
import '../styles/globals.css';
import '../styles/propertyTemplates.css';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthProvider } from '../context/auth-context';
import RoleSaver from '../components/Profile/RoleSaver';
import AnalyticsProvider from '../components/AnalyticsProvider';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [showRoleSaver, setShowRoleSaver] = useState(false);

  useEffect(() => {
    // Initialize client on app load
    initClient().catch(console.error);
    
    // Clean up all flags that could cause loops
    if (!['/create-profile', '/profile'].includes(window.location.pathname)) {
      sessionStorage.removeItem('selectedRoles');
      sessionStorage.removeItem('expectedRoles');
      sessionStorage.removeItem('dashboardLoadCount');
    }
  }, []);

  // Show RoleSaver only on dashboard, only once per session (client-side only)
  useEffect(() => {
    if (
      router.pathname === '/dashboard' &&
      !sessionStorage.getItem('roleSaverRendered')
    ) {
      setShowRoleSaver(true);
      sessionStorage.setItem('roleSaverRendered', 'true');
    } else {
      setShowRoleSaver(false);
    }
  }, [router.pathname]);

  // Use the layout defined at the page level, if available
  const getLayout = Component.getLayout || ((page) => page);

  return (
    <AuthProvider>
      <AnalyticsProvider>
        {showRoleSaver && <RoleSaver />}
        <ErrorBoundary>
          {getLayout(<Component {...pageProps} />)}
        </ErrorBoundary>
      </AnalyticsProvider>
    </AuthProvider>
  );
}

export default MyApp;
