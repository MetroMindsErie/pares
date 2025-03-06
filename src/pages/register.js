import React from 'react';
import MainLayout from '../../layouts/MainLayout';
import SignupForm from '@/components/SignupForm';
const Register = () => {
  return (
    <MainLayout>
      <div className="register-content">
        <h1>Register</h1>
        <SignupForm />
      </div>
    </MainLayout>
  );
};

export default Register;
