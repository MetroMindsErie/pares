import { useState } from 'react';
import { useAuth } from '../context/auth-context';

const FacebookLoginButton = ({ onSuccess, onError, buttonText = 'Continue with Facebook' }) => {
  const [loading, setLoading] = useState(false);
  const { loginWithProvider } = useAuth();
  
  const handleLogin = async () => {
    try {
      setLoading(true);
      const response = await loginWithProvider('facebook');
      // The actual success handling will happen in the auth callback page
      // This function will trigger a redirect, so onSuccess may not be called
      if (onSuccess) onSuccess(response);
    } catch (error) {
      console.error('Facebook login error:', error);
      if (onError) onError(error);
      setLoading(false);
    }
  };
  
  return (
    <button
      onClick={handleLogin}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 bg-[#1877F2] text-white p-3 rounded-lg hover:bg-[#1864D9] transition-colors disabled:bg-blue-300"
    >
      <img 
        src="/fb2.png" 
        alt="Facebook" 
        className="w-5 h-5" 
        style={{ filter: 'drop-shadow(0 0 5px rgba(0,0,0,0.5))' }} 
      />
      {loading ? 'Connecting...' : buttonText}
    </button>
  );
};

export default FacebookLoginButton;
