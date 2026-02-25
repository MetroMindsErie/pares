import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/auth-context';

const RegisterForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState(null);
  const [localLoading, setLocalLoading] = useState(false);
  
  const { signup, loginWithProvider, loading: authLoading, error: authError, user } = useAuth();
  const router = useRouter();
  
  // Check if loading is incorrectly persisting
  useEffect(() => {

    // Force authLoading to false after a delay if it's still true
    if (authLoading) {
      const timer = setTimeout(() => {

        // Note: We can't directly modify authLoading, but this helps for debugging
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [authLoading]);

  // Check user profile status and redirect accordingly
  useEffect(() => {
    const checkProfileAndRedirect = async () => {
      if (user) {
        try {
          // Import Supabase directly
          const { default: supabaseClient } = await import('../utils/supabaseClient');
          
          // Check if user has a profile
          const { data, error } = await supabaseClient
            .from('users')
            .select('hasprofile')
            .eq('id', user.id)
            .single();
          
          if (error) throw error;
          

          
          // Redirect based on profile status
          if (data && data.hasprofile) {

            router.push('/dashboard');
          } else {

            router.push('/create-profile?setup=true');
          }
        } catch (err) {
          console.error('Error checking profile status:', err);
          // Default to profile creation if there's an error
          router.push('/create-profile?setup=true');
        }
      }
    };
    
    if (user) {
      checkProfileAndRedirect();
    }
  }, [user, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    
    // Form validation
    if (!email || !password) {
      setFormError('Please enter both email and password');
      return;
    }
    
    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }
    
    // Password strength check
    if (password.length < 8) {
      setFormError('Password must be at least 8 characters long');
      return;
    }
    
    setLocalLoading(true);
    try {
      const { error } = await signup(email, password);
      
      if (error) {
        setFormError(error.message || 'Failed to sign up');
      } else {
        // Registration successful, redirect to profile setup
        router.push('/create-profile?setup=true');
      }
    } catch (err) {
      setFormError(err.message || 'An unexpected error occurred');
    } finally {
      setLocalLoading(false);
    }
  };

  // Simplified Facebook login
  const directFacebookLogin = async () => {
    try {

      
      // Import Supabase directly
      const { default: supabaseClient } = await import('../utils/supabaseClient');
      
      if (!supabaseClient?.auth?.signInWithOAuth) {
        throw new Error('Supabase auth methods not available');
      }

      // Get the current URL for the redirect
      const origin = window.location.origin;
      
      const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: `${origin}/auth/callback`,
          scopes: 'public_profile,email'
        }
      });
      
      if (error) throw error;
      

      return { data };
    } catch (err) {
      console.error('Direct Facebook login error:', err);
      setFormError(`Error with Facebook login: ${err.message}`);
      return { error: err };
    } finally {
      setLocalLoading(false); // Always reset loading state
    }
  };

  // Improved provider signup handler
  const handleProviderSignup = async (provider) => {
    setFormError(null);
    setLocalLoading(true);
    
    try {

      
      if (provider === 'facebook') {
        // Use direct method for Facebook since we need to ensure provider is saved
        return await directFacebookLogin();
      } 
      
      // For other providers, try context method first
      if (typeof loginWithProvider === 'function') {

        const result = await loginWithProvider(provider);
        
        if (result?.error) {
          throw result.error;
        }
        
        return result;
      } else {
        throw new Error(`Authentication method for ${provider} is not available`);
      }
    } catch (err) {
      console.error(`${provider} signup error:`, err);
      setFormError(`Error signing up with ${provider}: ${err.message || 'Unknown error'}`);
      
      // Add detailed logging
      console.error('Detailed error info:', {
        providerType: typeof provider,
        provider: provider,
        loginWithProviderType: typeof loginWithProvider,
        authContextAvailable: !!useAuth,
        windowLocation: window?.location?.href,
        error: err
      });
    } finally {
      setLocalLoading(false);
    }
  };

  // Use our local loading state or auth loading state, whichever is active
  const isLoading = localLoading || authLoading;
  
  // Add explicit onClick handler to ensure clicks are processed
  const handleButtonClick = (e) => {

    // The form's onSubmit will handle the actual submission
  };

  return (
    <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
      </div>

      <form className="space-y-6 mt-8" onSubmit={handleSubmit}>
        {/* Display any errors */}
        {(formError || authError) && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">
              {formError || authError}
            </div>
          </div>
        )}
        
        {/* Email field */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email address
          </label>
          <div className="mt-1">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Password field */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <div className="mt-1">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Confirm password field */}
        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
            Confirm Password
          </label>
          <div className="mt-1">
            <input
              id="confirm-password"
              name="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Submit button with explicit onClick handler */}
        <div>
          <button
            type="submit"
            disabled={isLoading}
            onClick={handleButtonClick}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700 cursor-pointer'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500`}
          >
            {isLoading ? 'Signing up...' : 'Sign up'}
          </button>
        </div>
      </form>

      {/* Social sign up options */}
      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div>
            <button
              onClick={() => handleProviderSignup('facebook')}
              disabled={isLoading}
              data-provider="facebook" // Add data attribute for debugging
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
            >
              <span className="sr-only">Sign up with Facebook</span>
              <svg className="w-5 h-5 text-teal-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M20 10c0-5.523-4.477-10-10-10S0 4.477 0 10c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V10h2.54V7.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V10h2.773l-.443 2.89h-2.33v6.988C16.343 19.128 20 14.991 20 10z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          <div>
            <button
              onClick={() => handleProviderSignup('google')}
              disabled={isLoading}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
            >
              <span className="sr-only">Sign up with Google</span>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                  <path
                    fill="#4285F4"
                    d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"
                  />
                  <path
                    fill="#34A853"
                    d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"
                  />
                </g>
              </svg>
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <a href="/login" className="font-medium text-teal-600 hover:text-teal-500">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;
