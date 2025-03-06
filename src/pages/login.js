import React from 'react';
import NoSSR from '../components/NoSSR';
import Layout from '../components/Layout';
import LoginForm from '../components/LoginForm';
import LoginRedirect from '../components/LoginRedirect';

export default function LoginPage() {
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

// Tell Next.js to treat this as a static page (no server-side props)
export async function getStaticProps() {
  return {
    props: {},
  };
}
