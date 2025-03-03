import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import supabase from '../lib/supabase-setup';
import { useAuth } from '../context/auth-context';

const Login = ({ onLogin }) => {
  const { isAuthenticated } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      console.log('Attempting login with:', username);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: username,
        password: password,
      });
      if (error) throw error;

      if (data?.user) {
        const { data: profileData } = await supabase
          .from('users')
          .select('hasprofile')
          .eq('id', data.user.id)
          .single();
        if (!profileData?.hasprofile) {
          router.push('/profile?setup=true');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message);
    }
  };

  const handleSocialLogin = async (provider) => {
    try {
      setError(null);
      const redirectTo = `${window.location.origin}/auth/callback`;
      console.log("Redirect URI:", redirectTo);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          scopes: provider === 'google' ? 'profile email' : 'email,public_profile',
          queryParams: provider === 'google' ? {
            prompt: 'select_account',
            access_type: 'offline',
          } : undefined,
        }
      });
      
      if (error) throw error;
    } catch (error) {
      console.error(`${provider} login error:`, error);
      setError(error.message);
    }
  };

  return (
    <div className="max-w-md mx-auto p-8 bg-white/80 backdrop-blur-md rounded-2xl shadow-xl mt-10">
      <h2 className="text-3xl font-semibold mb-6 text-center text-gray-800">Log In</h2>
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-center">
          {error}
        </div>
      )}
      
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

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>

        {/* Existing Email/Password Form */}
      <form onSubmit={handleLogin} className="space-y-6">
        <input
          type="text"
          placeholder="Email"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
        />
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-colors"
        >
          Login
        </button>
      </form>
    </div>
  );
};

export default Login;
