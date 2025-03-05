import React from 'react';
import '../styles/globals.css';
import '../styles/propertyTemplates.css';
import { ErrorBoundary } from '@/components/ErrorBoundry';
import Layout from '../components/Layout';
import { AuthProvider } from '../context/auth-context';

function MyApp({ Component, pageProps }) {
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
