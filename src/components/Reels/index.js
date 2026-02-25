import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/auth-context';
import ReelCard from './ReelCard';
import LoadingIndicator from '../common/LoadingIndicator';

// This component serves as a wrapper around the main Reels component
// It centralizes the API calls and provides consistent error handling
const ReelsWrapper = (props) => {

  
  // Simply forward all props to the Main component
  return <ReelsMain {...props} />;
};

function ReelsMain({ userId: propUserId, hasFacebookConnection: propHasFacebookConnection, autofetch = false }) {
  const { user, loginWithProvider } = useAuth();
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugData, setDebugData] = useState({});
  const [refreshCount, setRefreshCount] = useState(0);
  
  // Determine effective user ID
  const effectiveUserId = propUserId || user?.id;
  
  useEffect(() => {
    ('ReelsMain component mounted/updated:', { 
      effectiveUserId, 
      propHasFacebookConnection,
      autofetch
    });
    
    if (autofetch && effectiveUserId) {
      fetchReels();
    }
  }, [effectiveUserId, autofetch]);

  const fetchReels = async () => {
    setLoading(true);
    setError(null);
    setRefreshCount(prev => prev + 1);
    
    try {

      
      // Get auth token
      const { data: sessionData } = await axios.get('/api/auth/session');
      const token = sessionData?.token;
      

      
      // Call the reels API with force_fresh=true to ensure we fetch from Facebook
      const response = await axios.get('/api/reels/fetch', {
        headers: token ? { 
          Authorization: `Bearer ${token}` 
        } : {},
        params: {
          force_fresh: true // Always force fetch from Facebook Graph API
        }
      });
      

      
      if (response.data.reels && response.data.reels.length > 0) {
        setReels(response.data.reels);
        setDebugData({
          source: response.data.source || 'api',
          count: response.data.reels.length,
          timestamp: new Date().toISOString()
        });
      } else {
        setReels([]);
        setDebugData({
          source: response.data.source || 'api',
          message: 'No reels found',
          timestamp: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Error fetching reels:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load reels');
      setDebugData({
        error: err.response?.data || err.message,
        stack: err.stack
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchReels();
  };

  const handleConnectFacebook = async () => {
    try {
      if (typeof loginWithProvider !== 'function') {
        throw new Error('Facebook login function not available');
      }
      

      await loginWithProvider('facebook', {
        redirectTo: `${window.location.origin}/dashboard`
      });
    } catch (err) {
      console.error('Error connecting to Facebook:', err);
      setError(`Failed to connect to Facebook: ${err.message}`);
    }
  };

  // Show connect button if no Facebook connection
  if (propHasFacebookConnection === false) {
    return (
      <div className="p-8 text-center border rounded-lg bg-gray-50">
        <h3 className="text-lg font-medium mb-4">Connect with Facebook</h3>
        <p className="mb-4 text-gray-600">Connect your Facebook account to import your real estate reels.</p>
        <button
          onClick={handleConnectFacebook}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition duration-300"
        >
          Connect Facebook
        </button>
      </div>
    );
  }

  if (loading && refreshCount <= 1) {
    return <LoadingIndicator text="Loading your reels..." />;
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600 mb-4">{error}</p>
        <div className="flex gap-3">
          <button 
            onClick={handleRefresh}
            className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition duration-300"
          >
            Try Again
          </button>
          
          <button
            onClick={handleConnectFacebook}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition duration-300"
          >
            Reconnect Facebook
          </button>
        </div>
        
        {/* Debug data - can be removed in production */}
        <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-700">
          <h4 className="font-medium mb-1">Debug Information</h4>
          <pre className="overflow-auto max-h-40">{JSON.stringify(debugData, null, 2)}</pre>
        </div>
      </div>
    );
  }

  // Show empty state if no reels found
  if (!reels || reels.length === 0) {
    return (
      <div className="p-8 text-center border rounded-lg bg-gray-50">
        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <h3 className="text-lg font-medium mb-2">No Reels Found</h3>
        <p className="text-gray-600 mb-6">
          We couldn't find any videos in your Facebook account.
        </p>
        
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition duration-300"
          >
            Refresh
          </button>
          
          <button
            onClick={handleConnectFacebook}
            className="text-teal-600 underline hover:text-teal-800"
          >
            Reconnect Facebook
          </button>
        </div>
        
        {/* Debug data - can be removed in production */}
        <div className="mt-6 p-3 bg-gray-100 rounded text-xs text-gray-700 text-left">
          <h4 className="font-medium mb-1">Debug Information</h4>
          <pre className="overflow-auto max-h-40">{JSON.stringify(debugData, null, 2)}</pre>
        </div>
      </div>
    );
  }

  // Show reels grid
  return (
    <div>
      {loading && (
        <div className="text-center py-2 text-sm text-gray-500">
          <span className="inline-block animate-spin mr-1">⟳</span> Refreshing...
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {reels.map((reel, index) => (
          <ReelCard key={reel.id || `reel-${index}`} reel={reel} />
        ))}
      </div>

      <div className="flex justify-between items-center px-4 py-3 bg-gray-50 border-t border-gray-200">
        <div className="text-sm text-gray-500">
          {reels.length} reel{reels.length !== 1 ? 's' : ''}
        </div>
        
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition duration-300 flex items-center gap-2"
          disabled={loading}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {loading ? 'Refreshing...' : 'Refresh Reels'}
        </button>
      </div>
    </div>
  );
}

export default ReelsWrapper;