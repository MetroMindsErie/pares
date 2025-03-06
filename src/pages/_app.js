import React, { useEffect, useState } from 'react';
import '../styles/globals.css';
import '../styles/propertyTemplates.css';
import { ErrorBoundary } from '@/components/ErrorBoundry';
import Layout from '../components/Layout';
import { AuthProvider } from '../context/auth-context';

function MyApp({ Component, pageProps }) {
  const [isClient, setIsClient] = useState(false);

  // Set isClient to true when we're in the browser
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Add a custom getInitialProps to prevent automatic static optimization
  // for pages that require dynamic data
  if (Component.getInitialProps) {
    const originalGetInitialProps = Component.getInitialProps;
    Component.getInitialProps = async (ctx) => {
      // Skip data fetching during static generation
      if (!ctx.req) {
        return originalGetInitialProps(ctx);
      }

      // Return empty props during static build
      return { skipServerRender: true };
    };
  }

  // If we have skipServerRender in props, only render on client side
  if (pageProps.skipServerRender && !isClient) {
    return <div>Loading...</div>;
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default MyApp;
