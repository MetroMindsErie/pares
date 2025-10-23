import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import NoSSR from '../components/NoSSR';
import Layout from '../components/Layout';
import { useAuth } from '../context/auth-context';

// Import with error fallback
const RegisterForm = dynamic(() => import('../components/RegisterForm'), {
  ssr: false,
  loading: () => <div className="p-4 text-center">Loading registration form...</div>,
});

const RegisterRedirect = dynamic(() => import('../components/RegisterRedirect'), {
  ssr: false,
});

function Register() {
  // Add logging to debug production issues
  const { loading } = useAuth();
  
  useEffect(() => {

  }, [loading]);
  
  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <NoSSR>
            <RegisterRedirect />
            <RegisterForm key="register-form" />
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

export default Register;
