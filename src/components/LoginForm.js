import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/auth-context';

// Safe import of Supabase client only on client side
let supabaseClient = null;

const Login = () => {
  const { isAuthenticated, login, loginWithProvider, loading, error: authError, getRedirectPath } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const router = useRouter();
  
  // Initialize supabase client only on client side
  useEffect(() => {
    async function loadSupabase() {
      try {
        const { default: supabase } = await import('../utils/supabaseClient');
        supabaseClient = supabase;
      } catch (err) {
        console.error('Error loading Supabase client:', err);
      }
    }
    loadSupabase();
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const redirectPath = getRedirectPath();
      if (redirectPath) {
        router.push(redirectPath);
      }
    }
  }, [isAuthenticated, getRedirectPath, router]);

  // Handle form submission
  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!username || !password) {
      setError('Please enter both email and password');
      return;
    }
    
    try {

      const { data: loginData, error } = await login(username, password);
      if (error) throw error;

      // Let the auth context handle redirection based on profile status
      const redirectPath = getRedirectPath();
      if (redirectPath) {
        router.push(redirectPath);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message);
    }
  };

  // Social login handler
  const handleSocialLogin = async (provider) => {
    setError(null);
    await loginWithProvider(provider);
    // No need to handle redirect here as the auth state change will trigger the effect above
  };

  // Return the form interface
  return (
    <div className="max-w-md mx-auto p-8 bg-white/80 backdrop-blur-md rounded-2xl shadow-xl mt-10">
      <h2 className="text-3xl font-semibold mb-6 text-center text-gray-800">Log In</h2>
      {(error || authError) && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-center">
          {error || authError}
        </div>
      )}
      
      {/* Social login buttons */}
      <div className="space-y-3 mb-6">
        <button
          onClick={() => handleSocialLogin('google')}
          className="w-full flex items-center justify-center gap-2 bg-[#E85445] text-white p-3 rounded-lg hover:bg-[#C33D2E] transition-colors"
        >
          <img src="/google.png" alt="Google" className="w-5 h-5 rounded-full" style={{ marginRight: '8px', filter: 'drop-shadow(0 0 5px rgba(0,0,0,0.5))' }} />
          Continue with Google
        </button>
        
        <button
          onClick={() => handleSocialLogin('facebook')}
          className="w-full flex items-center justify-center gap-2 bg-[#1877F2] text-white p-3 rounded-lg hover:bg-[#1864D9] transition-colors"
        >
          <img src="/fb2.png" alt="Facebook" className="w-5 h-5" style={{ marginRight: '8px', filter: 'drop-shadow(0 0 5px rgba(0,0,0,0.5))' }} />
          Continue with Facebook
        </button>
      </div>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or continue with</span>
        </div>
      </div>

      {/* Email/Password form */}
      <form onSubmit={handleLogin} className="space-y-6">
        <input
          type="text"
          placeholder="Email"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
        />
        <button
          type="submit"
          disabled={loading}
          className={`w-full bg-gradient-to-r from-teal-500 to-green-500 text-white py-3 rounded-lg hover:from-teal-600 hover:to-green-600 transition-colors ${loading ? 'bg-teal-400' : ''}`}
        >
          {loading ? 'Signing in...' : 'Login'}
        </button>
      </form>
    </div>
  );
};

export default Login;
