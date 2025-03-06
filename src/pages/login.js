import React from 'react';
import dynamic from 'next/dynamic';
import Layout from '../components/Layout';

// Import LoginForm with SSR disabled
const LoginForm = dynamic(() => import('../components/LoginForm'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center">
      <div className="p-4 text-center">
        Loading login form...
      </div>
    </div>
  ),
});

// Simple wrapper component to avoid hooks in the main component
const LoginRedirect = dynamic(() => import('../components/LoginRedirect'), {
  ssr: false,
});

export default function LoginPage() {
  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Auth redirect logic is now inside this component */}
          <LoginRedirect />
          <LoginForm />
        </div>
      </div>
    </Layout>
  );
}

// Tell Next.js to export this page as a static HTML page
// This helps avoid SSR issues while still allowing prerendering
export async function getStaticProps() {
  return {
    props: {},
  };
}
