import React from 'react';
import dynamic from 'next/dynamic';
import NoSSR from '../components/NoSSR';
import Layout from '../components/Layout';

// Import with SSR disabled
const LoginForm = dynamic(() => import('../components/LoginForm'), { ssr: false });
const LoginRedirect = dynamic(() => import('../components/LoginRedirect'), { ssr: false });

// Create the page component
function LoginPage() {
  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <NoSSR>
            <LoginRedirect />
            <LoginForm />
          </NoSSR>
        </div>
      </div>
    </Layout>
  );
}

// Force server-side rendering instead of static generation
export async function getServerSideProps() {
  return { props: {} };
}

export default LoginPage;
