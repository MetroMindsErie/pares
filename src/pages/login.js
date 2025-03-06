import React from 'react';
import dynamic from 'next/dynamic';
import NoSSR from '../components/NoSSR';
import Layout from '../components/Layout';
import LoginForm from '../components/LoginForm';
import LoginRedirect from '../components/LoginRedirect';

function LoginPage() {
  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Render the auth components only on the client */}
          <NoSSR>
            <LoginRedirect />
            <LoginForm />
          </NoSSR>
        </div>
      </div>
    </Layout>
  );
}

// Disable SSR for the entire page
export default dynamic(() => Promise.resolve(LoginPage), { ssr: false });
