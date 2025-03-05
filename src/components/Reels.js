import React, { useState, useEffect } from 'react';
import axios from 'axios';
import supabase from '../lib/supabase-setup';
import { useAuth } from '../context/auth-context';
import { loginWithFacebook } from '../lib/facebook-auth';
import { getAuthHeaders } from '../lib/api-helpers';

const Reels = () => {
  const { user, isAuthenticated, socialConnections } = useAuth();
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
  // This will help determine if Facebook is connected
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
      
      // Try to fetch reels - if successful, Facebook must be connected
      const response = await axios.get('/api/reels/fetch', authConfig);
      setReels(response.data.reels || []);
      
      // If we successfully fetched reels, Facebook must be connected
      setIsFacebookConnected(true);
    } catch (err) {
      console.error('Error fetching reels:', err);
      
      // Only set errors in non-silent mode
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
    await fetchReels();
    setRefreshing(false);
  };

  const handleConnectFacebook = async () => {
    try {
      await loginWithFacebook();
      // After successful connection, fetch reels to verify connection
      await fetchReels();
    } catch (err) {
      console.error('Error connecting to Facebook:', err);
      setError('Failed to connect to Facebook');
    }
  };

  // Render based on authentication and Facebook connection status
  if (!isAuthenticated) {
    return (
      <section className="p-10 bg-gray-100">
        <h2 className="text-3xl font-bold text-center mb-6">Real Estate Reels</h2>
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <p className="mb-4">Please log in to view your real estate reels.</p>
          <a href="/login" className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg">
            Go to Login
          </a>
        </div>
      </section>
    );
  }

  if (!isFacebookConnected) {
    return (
      <section className="p-10 bg-gray-100">
        <h2 className="text-3xl font-bold text-center mb-6">Real Estate Reels</h2>
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <p className="mb-4">Connect your Facebook account to view your real estate reels.</p>
          <button
            onClick={handleConnectFacebook}
            className="inline-block bg-[#1877F2] text-white px-4 py-2 rounded-lg"
          >
            Connect Facebook
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="p-10 bg-gray-100">
      <h2 className="text-3xl font-bold text-center mb-6">Real Estate Reels</h2>

      {loading ? (
        <div className="text-center py-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-2">Loading your real estate reels...</p>
        </div>
      ) : error ? (
        <div className="text-red-500 text-center p-4 bg-red-50 rounded-lg">
          {error}
          <div className="mt-4">
            <button
              onClick={handleRefresh}
              className="mr-4 px-3 py-1 bg-blue-500 text-white rounded"
            >
              Try Again
            </button>
            <button
              onClick={handleConnectFacebook}
              className="px-3 py-1 bg-[#1877F2] text-white rounded"
            >
              Reconnect Facebook
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4 flex justify-end">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 disabled:bg-blue-300"
            >
              {refreshing ? 'Refreshing...' : 'Refresh Reels'}
            </button>
          </div>
          {reels.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reels.map((reel) => (
                <div key={reel.id} className="bg-white p-6 rounded-lg shadow-lg">
                  {reel.embedHtml ? (
                    <div 
                      className="w-full h-64 mb-3" 
                      dangerouslySetInnerHTML={{ __html: reel.embedHtml }} 
                    />
                  ) : reel.video_url ? (
                    <video 
                      autoPlay 
                      muted 
                      loop 
                      playsInline 
                      controls 
                      className="w-full h-64 object-cover rounded-lg mb-3"
                    >
                      <source src={reel.video_url} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <div className="w-full h-64 bg-gray-300 flex items-center justify-center rounded-lg mb-3">
                      <p className="text-gray-700">No video available</p>
                    </div>
                  )}
                  <h3 className="text-xl font-semibold">{reel.title || 'Untitled Reel'}</h3>
                  {reel.description && (
                    <p className="mt-2 text-gray-600">{reel.description}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 bg-white rounded-lg shadow-md">
              <p className="mb-4">No real estate reels found on your Facebook account.</p>
              <p className="text-gray-500">Try adding real estate related hashtags to your videos on Facebook.</p>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default Reels;
