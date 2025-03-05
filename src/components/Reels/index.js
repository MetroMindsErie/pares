import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/auth-context';
import { loginWithFacebook } from '../../lib/facebook-auth';
import { getAuthHeaders } from '../../lib/api-helpers';
import LoadingIndicator from '../common/LoadingIndicator';
import ReelCard from './ReelCard';

// Enhanced Icons with tooltips
const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg" title="Refresh Reels">
    <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
    <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
  </svg>
);

const FacebookIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg" title="Connect with Facebook">
    <path d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951z"/>
  </svg>
);

const Reels = () => {
  const { isAuthenticated, socialConnections } = useAuth();
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isFacebookConnected, setIsFacebookConnected] = useState(socialConnections?.facebook || false);

  // Initialize based on auth context
  useEffect(() => {
    if (socialConnections?.facebook) {
      setIsFacebookConnected(true);
    }
  }, [socialConnections]);

  // Initial load - always try to fetch reels
  useEffect(() => {
    if (isAuthenticated) {
      fetchReels(true); // silent mode for initial check
    }
  }, [isAuthenticated]);

  // Normal fetch when dependencies change
  useEffect(() => {
    if (isAuthenticated && isFacebookConnected) {
      fetchReels();
    }
  }, [isAuthenticated, isFacebookConnected]);

  const fetchReels = async (silent = false) => {
    if (!isAuthenticated) return;
    
    if (!silent) setLoading(true);
    if (!silent) setError(null);
    
    try {
      const authConfig = await getAuthHeaders();
      const response = await axios.get('/api/reels/fetch', authConfig);
      setReels(response.data.reels || []);
      setIsFacebookConnected(true);
    } catch (err) {
      console.error('Error fetching reels:', err);
      
      if (!silent) {
        if (
          err.response?.data?.action === 'connect_facebook' ||
          err.response?.data?.action === 'reconnect_facebook'
        ) {
          setError('Please connect your Facebook account to access your reels');
          setIsFacebookConnected(false);
        } else {
          setError(err.response?.data?.error || 'Failed to load reels');
        }
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchReels();
    } finally {
      setRefreshing(false);
    }
  };

  const handleConnectFacebook = async () => {
    try {
      await loginWithFacebook();
      await fetchReels();
    } catch (err) {
      console.error('Error connecting to Facebook:', err);
      setError('Failed to connect to Facebook. Please try again.');
    }
  };

  // Not authenticated view
  if (!isAuthenticated) {
    return (
      <section className="bg-gradient-to-b from-white to-gray-100 rounded-lg overflow-hidden shadow-sm">
        <header className="px-6 py-5 flex justify-between items-center border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Unlock Your Real Estate Reels</h2>
            <p className="text-base text-gray-600 mt-1">Showcase your properties with engaging video content.</p>
          </div>
        </header>
        <div className="p-6">
          <div className="text-center p-8 bg-white rounded-lg shadow-sm">
            <p className="text-lg font-medium text-gray-900 mb-4">Join our community to view your real estate reels!</p>
            <a 
              href="/login" 
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 transition duration-200"
            >
              Login to View Reels
            </a>
          </div>
        </div>
      </section>
    );
  }

  // Facebook not connected view
  if (!isFacebookConnected) {
    return (
      <section className="bg-gradient-to-b from-white to-gray-100 rounded-lg overflow-hidden shadow-sm">
        <header className="px-6 py-5 flex justify-between items-center border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Connect to Facebook for Reels</h2>
            <p className="text-base text-gray-600 mt-1">Elevate your property listings with engaging video content.</p>
          </div>
        </header>
        <div className="p-6">
          <div className="text-center p-8 bg-white rounded-lg shadow-sm">
            <p className="text-lg font-medium text-gray-900 mb-4">Connect with Facebook to unlock your reels!</p>
            <p className="text-gray-600">
              Link your Facebook account to import and display your real estate reels effortlessly.
            </p>
            <div className="mt-6">
              <button
                onClick={handleConnectFacebook}
                className="inline-flex items-center bg-[#1877F2] text-white px-4 py-2 rounded-md font-medium hover:bg-[#0d65d9] transition duration-200"
              >
                <FacebookIcon className="mr-2" /> Connect Facebook
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Main view with reels
  return (
    <section className="bg-gradient-to-b from-white to-gray-100 rounded-lg overflow-hidden shadow-sm">
      <header className="px-6 py-5 flex justify-between items-center border-b border-gray-200">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Your Real Estate Reels</h2>
          <p className="text-base text-gray-600 mt-1">Engage potential buyers with dynamic property videos from Facebook.</p>
        </div>
        <div className="py-2">
          <button 
            onClick={handleRefresh}
            disabled={refreshing || loading}
            aria-label="Refresh reels"
            className="inline-flex items-center bg-white text-gray-700 border border-gray-300 px-3 py-1 rounded-md font-medium hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition duration-200"
          >
            <RefreshIcon className="mr-1" /> {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </header>
      
      <div className="p-6">
        {loading ? (
          <LoadingIndicator text="Fetching your stunning real estate reels..." />
        ) : error ? (
          <div className="text-center p-4 bg-red-50 border border-red-500 text-red-600 rounded-lg">
            <p className="text-lg font-medium mb-2">{error}</p>
            <div className="mt-4 flex justify-center gap-4">
              <button 
                onClick={handleRefresh}
                className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition duration-200"
              >
                Try Again
              </button>
              <button 
                onClick={handleConnectFacebook}
                className="inline-flex items-center bg-[#1877F2] text-white px-3 py-1 rounded-md hover:bg-[#0d65d9] transition duration-200"
              >
                <FacebookIcon className="mr-1" /> Reconnect Facebook
              </button>
            </div>
          </div>
        ) : (
          <>
            {reels.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reels.map((reel) => (
                  <ReelCard key={reel.id} reel={reel} />
                ))}
              </div>
            ) : (
              <div className="text-center p-8 bg-white rounded-lg shadow-sm">
                <p className="text-lg font-medium text-gray-900 mb-4">No Reels Found</p>
                <p className="text-gray-600">
                  Ready to showcase your properties? We couldn't find any reels on your Facebook account.
                </p>
                <button 
                  onClick={handleRefresh}
                  className="mt-6 bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 transition duration-200"
                >
                  Refresh
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default Reels;