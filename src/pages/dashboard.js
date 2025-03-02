import React from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/auth-context';

export default function DashboardPage() {
  const { user, role } = useAuth();

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl mb-4">Dashboard</h1>
        {user ? (
          <>
            <p>Welcome, {user.email}!</p>
            {role && <p>Your role: {role}</p>}
            {/* Dashboard content here */}
          </>
        ) : (
          <p>You are in guest mode. Please log in for full access.</p>
        )}
      </div>
    </Layout>
  );
}
