import React from 'react';
import '../styles/globals.css';
import '../styles/propertyTemplates.css';
import { ErrorBoundary } from '@/components/ErrorBoundry';

function MyApp({ Component, pageProps }) {
  return (
    <ErrorBoundary>
      <Component {...pageProps} />
    </ErrorBoundary>
  );
}

export default MyApp;
