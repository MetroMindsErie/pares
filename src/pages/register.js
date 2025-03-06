import React from 'react';
import dynamic from 'next/dynamic';
import MainLayout from '../../layouts/MainLayout';

// Import SignupForm with SSR disabled
const SignupForm = dynamic(() => import('@/components/SignupForm'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center">
      <div className="p-4 text-center">
        Loading registration form...
      </div>
    </div>
  ),
});

// Simple wrapper component to avoid hooks in the main component
const RegisterRedirect = dynamic(() => import('@/components/RegisterRedirect'), {
  ssr: false,
});

export default function Register() {
  return (
    <MainLayout>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Auth redirect logic is now inside this component */}
          <RegisterRedirect />
          <SignupForm />
        </div>
      </div>
    </MainLayout>
  );
}

// Tell Next.js to export this page as a static HTML page
// This helps avoid SSR issues while still allowing prerendering
export async function getStaticProps() {
  return {
    props: {},
  };
}
