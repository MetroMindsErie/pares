import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/auth-context';
import supabase from '../lib/supabase-setup';
import { processAndStoreReels, getFacebookToken, checkFacebookConnection } from '../services/facebookService';
import ReelCard from './Reels/ReelCard';

// Props:
// - userId: Optional user ID to override the one from auth context
// - hasFacebookConnection: Optional boolean to indicate if user has Facebook connection
// - autofetch: If true, will automatically fetch reels on mount
const Reels = ({ userId: propUserId, hasFacebookConnection: propHasFacebookConnection, autofetch = false }) => {
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasFacebookConnection, setHasFacebookConnection] = useState(propHasFacebookConnection || false);
  const { user, loginWithProvider } = useAuth();
  const [hasAutoFetched, setHasAutoFetched] = useState(false);
  
  // Extra safety check - force load user from session if not available
  const [sessionChecked, setSessionChecked] = useState(false);
  const [sessionUser, setSessionUser] = useState(null);
  
  // Check for session user if user not available in context
  useEffect(() => {
    const checkSession = async () => {
      if (!user && !sessionChecked) {
        try {
          const { data } = await supabase.auth.getSession();
          if (data?.session?.user) {
            setSessionUser(data.session.user);
          }
        } catch (err) {
          // Silent error
        }
        setSessionChecked(true);
      }
    };
    
    checkSession();
  }, [user, sessionChecked]);

  // Determine which user ID to use - prioritize prop, then context, then session
  const effectiveUserId = propUserId || user?.id || sessionUser?.id;
  
  useEffect(() => {
    // Important: If we don't have a user ID, we should reset loading state
    if (!effectiveUserId && loading) {
      setError('No user ID available. Please log in again.');
      setLoading(false);
    }
  }, [effectiveUserId, loading]);

  // Check Facebook connection status if not explicitly provided
  useEffect(() => {
    // If no user ID, we can't check connection
    if (!effectiveUserId) {
      return;
    }
    
    // Skip if connection state was provided via props
    if (propHasFacebookConnection !== undefined) {
      setHasFacebookConnection(propHasFacebookConnection);
      return;
    }
    
    const checkConnection = async () => {      
      try {
        const hasConnection = await checkFacebookConnection(effectiveUserId);
        setHasFacebookConnection(hasConnection);
      } catch (err) {
        // Silent error
      }
    };
    
    checkConnection();
  }, [effectiveUserId, propHasFacebookConnection]);

  // Auto-fetch reels when component mounts if autofetch is true
  useEffect(() => {
    // Critical: Don't attempt to fetch if we don't have a userId
    if (autofetch && effectiveUserId && hasFacebookConnection && !hasAutoFetched) {
      fetchReels(effectiveUserId);
      setHasAutoFetched(true);
    } else if (autofetch && !effectiveUserId && !hasAutoFetched) {
      // Handle the case where we want to autofetch but have no userId
      setError('Unable to fetch reels: User ID is not available');
      setLoading(false);
      setHasAutoFetched(true); // Mark as attempted to avoid infinite loops
    }
  }, [autofetch, effectiveUserId, hasFacebookConnection, hasAutoFetched]);

  // Fetch reels from database or Facebook API
  const fetchReels = useCallback(async (userId = effectiveUserId) => {
    if (!userId) {
      setError('User ID is required to fetch reels');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // First try to get reels directly from the database for quick loading
      try {
        const { data: dbReels, error: dbError } = await supabase
          .from('reels')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
          
        if (dbError) {
          // Continue to try Facebook if db error
        } else if (dbReels && dbReels.length > 0) {
          setReels(dbReels);
          setLoading(false);
          
          // Fetch fresh reels in the background if we already have some
          fetchFreshReelsInBackground(userId);
          return;
        }
      } catch (dbError) {
        // Continue to try Facebook if db error
      }
      
      // If we get here, we need to fetch from Facebook directly
      await fetchReelsFromFacebook(false, userId);
    } catch (err) {
      setError('Failed to load reels: ' + err.message);
      setLoading(false);
    }
  }, [effectiveUserId]);

  // Fetch fresh reels from Facebook in the background
  const fetchFreshReelsInBackground = async (userId = effectiveUserId) => {
    if (!userId) {
      return;
    }
    
    try {
      await fetchReelsFromFacebook(true, userId);
    } catch (bgError) {
      // Silent error for background operations
    }
  };

  // Core function to fetch reels from Facebook
  const fetchReelsFromFacebook = async (isBackground = false, userId = effectiveUserId) => {
    if (!userId) {
      const errorMsg = 'Cannot fetch from Facebook: no user ID available';
      
      if (!isBackground) {
        setError(errorMsg);
        setLoading(false);
      }
      return;
    }
    
    try {
      // Get Facebook token
      const tokenData = await getFacebookToken(userId);
      
      if (!tokenData || !tokenData.accessToken) {
        const errorMsg = 'No Facebook access token available';
        
        if (!isBackground) {
          setError(errorMsg);
          setLoading(false);
        }
        return;
      }
      
      // Process and store reels
      try {
        const fetchedReels = await processAndStoreReels(userId, true);
        
        // Update UI if we got reels (or if not in background mode)
        if (fetchedReels?.length > 0) {
          setReels(fetchedReels);
          
          if (!isBackground) setLoading(false);
        } else if (!isBackground) {
          setReels([]);
          setLoading(false);
        }
      } catch (fbError) {
        // Special handling for unique constraint violations
        let errorMessage = 'Error fetching reels from Facebook';
        
        // Special handling for unique constraint violations
        if (fbError.code === '23505' || 
            (fbError.message && fbError.message.includes('duplicate key value'))) {
          
          try {
            // Try to load reels from database despite the error
            const { data: existingReels } = await supabase
              .from('reels')
              .select('*')
              .eq('user_id', userId)
              .order('created_at', { ascending: false });
              
            if (existingReels && existingReels.length > 0) {
              setReels(existingReels);
              
              if (!isBackground) setLoading(false);
              return;
            }
          } catch (recoveryError) {
            // Silent error during recovery attempt
          }
          
          errorMessage = 'There was an issue syncing some of your reels. Please try again later.';
        } else if (fbError.response?.data?.error?.message) {
          errorMessage += `: ${fbError.response.data.error.message}`;
          
          // Special handling for common errors
          if (fbError.response.data.error.code === 190) {
            errorMessage = "Facebook session expired. Please reconnect your Facebook account.";
          }
        } else {
          errorMessage += `: ${fbError.message}`;
        }
        
        if (!isBackground) {
          setError(errorMessage);
          setLoading(false);
        }
      }
    } catch (err) {
      if (!isBackground) {
        setError('Failed to load reels: ' + err.message);
        setLoading(false);
      }
    }
  };

  // Connect Facebook button handler
  const handleConnectFacebook = async () => {
    try {
      if (typeof loginWithProvider !== 'function') {
        throw new Error('Facebook login function not available');
      }
      
      await loginWithProvider('facebook');
      // Note: Redirect will happen after successful login
    } catch (err) {
      setError('Failed to connect to Facebook: ' + err.message);
    }
  };

  // Refresh button handler
  const handleRefresh = () => {
    if (!effectiveUserId) {
      setError('Cannot refresh: No user ID is available. Please log in again.');
      return;
    }
    
    fetchReels(effectiveUserId);
  };

  // Show connect button if no Facebook connection
  if (!hasFacebookConnection) {
    return (
      <div className="p-8 text-center border rounded-lg bg-gray-50">
        <h3 className="text-lg font-medium mb-4">Connect with Facebook</h3>
        <p className="mb-4 text-gray-600">Connect your Facebook account to import your real estate reels.</p>
        <button
          onClick={handleConnectFacebook}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-300"
        >
          Connect Facebook
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading your reels...</p>
        {!effectiveUserId && (
          <div className="mt-2 text-amber-600 text-sm">
            Warning: No user ID available. Please refresh the page or log in again.
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600 mb-4">{error}</p>
        <div className="flex gap-3">
          <button 
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-300"
            disabled={!effectiveUserId}
          >
            Try Again
          </button>
          
          {!effectiveUserId && (
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition duration-300"
            >
              Refresh Page
            </button>
          )}
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
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-300"
          disabled={!effectiveUserId}
        >
          Refresh
        </button>
        {!effectiveUserId && (
          <div className="mt-4 text-amber-600">
            No user ID available. Please refresh the page or log in again.
          </div>
        )}
      </div>
    );
  }

  // Show reels grid
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {reels.map((reel, index) => (
          <ReelCard key={reel.id || reel.facebook_reel_id || index} reel={reel} />
        ))}
      </div>

      <div className="flex justify-center mt-6 mb-4">
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-300 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Reels
        </button>
      </div>
    </div>
  );
};

export default Reels;
