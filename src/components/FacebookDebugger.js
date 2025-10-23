import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/auth-context';
import supabase from '../lib/supabase-setup';

// NOTE: Only include this component during development
const FacebookDebugger = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState('idle');
  const [tokenDetails, setTokenDetails] = useState(null);
  const [manualToken, setManualToken] = useState('');
  
  const checkToken = async () => {
    if (!user) return;
    
    try {
      setStatus('loading');
      
      // Check users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('facebook_access_token, facebook_user_id, facebook_token_valid, facebook_token_updated_at')
        .eq('id', user.id)
        .single();
        
      // Check auth_providers table
      const { data: providerData, error: providerError } = await supabase
        .from('auth_providers')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'facebook');
        
      setTokenDetails({
        userData: userData || null,
        userError: userError?.message || null,
        providerData: providerData || [],
        providerError: providerError?.message || null
      });
      
      setStatus('success');
    } catch (err) {
      console.error('Token check error:', err);
      setStatus('error');
    }
  };
  
  const handleFixToken = async () => {
    if (!user || !manualToken) return;
    
    try {
      setStatus('fixing');
      
      // Call our debug endpoint to fix the token
      const response = await axios.post('/api/debug/facebook-token', {
        user_id: user.id,
        access_token: manualToken,
        provider_user_id: tokenDetails?.userData?.facebook_user_id || '123456789'
      });
      

      
      // Refresh token status
      await checkToken();
      
      setStatus('fixed');
    } catch (err) {
      console.error('Fix error:', err);
      setStatus('error');
    }
  };

  const handleManualTokenSave = async () => {
    if (!user || !manualToken) return;
    
    try {
      setStatus('saving');
      
      // Call our debug endpoint to save the token
      const response = await axios.post('/api/debug/save-fb-token', {
        user_id: user.id,
        token: manualToken
      });
      

      
      // Refresh token status
      await checkToken();
      
      setStatus('saved');
    } catch (err) {
      console.error('Error saving token:', err);
      setStatus('error');
    }
  };
  
  useEffect(() => {
    if (user) {
      checkToken();
    }
  }, [user]);
  
  if (!user || process.env.NODE_ENV === 'production') return null;
  
  return (
    <div className="mt-6 bg-orange-50 border border-orange-300 rounded-md p-4">
      <h3 className="text-lg font-bold text-orange-800">🛠️ Facebook Debug Panel</h3>
      <p className="text-sm text-orange-700 mb-4">This panel is only visible in development mode</p>
      
      <div className="flex justify-between mb-4">
        <span className="text-sm font-medium">Status: {status}</span>
        <button 
          onClick={checkToken}
          className="text-xs bg-orange-200 hover:bg-orange-300 px-2 py-1 rounded"
        >
          Refresh
        </button>
      </div>
      
      {tokenDetails && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-bold mb-1">Users Table:</h4>
            <pre className="text-xs bg-white p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(tokenDetails.userData || tokenDetails.userError, null, 2)}
            </pre>
          </div>
          
          <div>
            <h4 className="text-sm font-bold mb-1">Auth Providers Table:</h4>
            <pre className="text-xs bg-white p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(tokenDetails.providerData || tokenDetails.providerError, null, 2)}
            </pre>
          </div>
          
          <div>
            <h4 className="text-sm font-bold mb-1">Manual Token Fix:</h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Paste a valid Facebook token here"
                className="flex-1 text-sm px-2 py-1 border rounded"
              />
              <button
                onClick={handleFixToken}
                disabled={!manualToken}
                className="bg-orange-500 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
              >
                Fix Token
              </button>
              <button
                onClick={handleManualTokenSave}
                disabled={!manualToken}
                className="bg-orange-500 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
              >
                Save Token
              </button>
            </div>
            <p className="text-xs text-orange-700 mt-1">
              Only use this if you have a valid token to manually add to the database
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacebookDebugger;
