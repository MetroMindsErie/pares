import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import ReactGA from 'react-ga4';
import '../styles/globals.css';
import '../styles/propertyTemplates.css';

// Initialize Google Analytics with environment variable
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

if (!GA_MEASUREMENT_ID) {
  throw new Error('Require GA_MEASUREMENT_ID');
}

if (typeof ReactGA.initialize === 'function') {
  ReactGA.initialize(GA_MEASUREMENT_ID);
} else {
  console.error('ReactGA.initialize is not a function');
}

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    const handleRouteChange = (url) => {
      ReactGA.send({ hitType: 'pageview', page: url });
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  return <Component {...pageProps} />;
}

export default MyApp;
