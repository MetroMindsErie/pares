import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Poppins } from 'next/font/google';
import { initClient } from '../lib/setup-client';
import 'leaflet/dist/leaflet.css';
import '../styles/globals.css';
import '../styles/propertyTemplates.css';
import '../styles/animations.css';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthProvider } from '../context/auth-context';
import RoleSaver from '../components/Profile/RoleSaver';
import AnalyticsProvider from '../components/AnalyticsProvider';

// Self-hosted via next/font: no render-blocking Google Fonts request, zero layout shift.
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
});

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
        {/* Site-wide defaults — rendered first so any page-level <Head> overrides them */}
        <Head>
          <title>pares.homes – Real Estate Network</title>
          <meta name="description" content="Modern real estate search, analytics, and professional tools" />
          <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
          <link rel="apple-touch-icon" href="/pares_homes.png" />
          {/* Plain style tag (not styled-jsx — its hydration breaks dev CSS injection) */}
          <style dangerouslySetInnerHTML={{ __html: `:root { --font-poppins: ${poppins.style.fontFamily}; }` }} />
        </Head>
        {showRoleSaver && <RoleSaver />}
        <ErrorBoundary>
          {getLayout(<Component {...pageProps} />)}
        </ErrorBoundary>
      </AnalyticsProvider>
    </AuthProvider>
  );
}

// Web Vitals → GA4 (via the GTM dataLayer set up in _document.js)
export function reportWebVitals({ id, name, label, value }) {
  if (typeof window === 'undefined' || !window.dataLayer) return;
  window.dataLayer.push({
    event: 'web_vitals',
    metric_id: id,
    metric_name: name,
    metric_label: label,
    // CLS is a unitless score; GA wants integers — follow the official convention.
    metric_value: Math.round(name === 'CLS' ? value * 1000 : value),
  });
}

export default MyApp;
