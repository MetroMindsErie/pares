import { useState } from 'react';
import { useAuth } from '../context/auth-context';
import supabase from '../lib/supabase-setup';

const SignupForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(''); // new state for confirmation message
  
  const { signup } = useAuth();
  // Removed unused router variable to avoid the "p is not a function" error.
  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { user, error } = await signup(email, password);
      
      if (error) {
        setError(error.message);
        return;
      }

      if (!user) {
        setError('Failed to sign up. Please try again.');
        return;
      }

      setMessage("Registration successful! Please check your email to confirm your account.");
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-8 bg-white/80 backdrop-blur-md rounded-2xl shadow-xl mt-10">
      <h2 className="text-3xl font-semibold mb-6 text-center text-gray-800">Sign Up</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>
      )}
      
      {message && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">{message}</div>}
      
      <form onSubmit={handleSignup} className="space-y-5">
        <div className="mb-4">
          <label className="block text-gray-700 mb-1" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            required
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 mb-1" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-colors disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Sign Up'}
        </button>
      </form>
    </div>
  );
};

export default SignupForm;
