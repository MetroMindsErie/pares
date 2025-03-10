import React from 'react';
import '../styles/globals.css';
import '../styles/propertyTemplates.css';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function SafeHydrate({ children }) {
  return (
    <div suppressHydrationWarning>
      {typeof window === 'undefined' ? null : children}
    </div>
  );
}

function MyApp({ Component, pageProps }) {
  // Use the layout defined at the page level, if available
  const getLayout = Component.getLayout || ((page) => page);
  
  // Determine if this is an auth page that needs special handling
  const isAuthPage = ['/login', '/register', '/profile'].includes(
    typeof window !== 'undefined' ? window.location.pathname : ''
  );

  return (
    <ErrorBoundary>
      {isAuthPage ? (
        <SafeHydrate>
          {getLayout(<Component {...pageProps} />)}
        </SafeHydrate>
      ) : (
        getLayout(<Component {...pageProps} />)
      )}
    </ErrorBoundary>
  );
}

export default MyApp;
