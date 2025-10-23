import React, { useState, useEffect } from 'react';
import { requestAdditionalPermissions } from '../services/facebookService';

/**
 * Component to handle requesting additional Facebook permissions
 */
const FacebookPermissionRequest = ({ missingPermissions = [], onComplete }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  
  // For debugging
  useEffect(() => {
    // Get the base URL and Facebook app ID for debugging
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || 'Not set';
    
    setDebugInfo({
      baseUrl,
      appId: appId.substring(0, 6) + '...',  // Only show first few chars of app ID for security
      redirectUri: `${baseUrl}/api/auth/facebook/callback`
    });
  }, []);
  
  const handleRequestPermissions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await requestAdditionalPermissions();
      
      if (result.success && result.permissionUrl) {
        // Store current location to return after permission grant
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('returnAfterPermission', window.location.pathname);
        }
        
        // For debugging

        
        // Redirect to Facebook permission dialog
        window.location.href = result.permissionUrl;
      } else {
        setError('Could not generate permission request URL: ' + (result.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error requesting permissions:', err);
      setError('An error occurred while requesting permissions: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="p-6 max-w-xl mx-auto my-4 bg-white shadow-md rounded-lg border border-gray-200">
      <h2 className="text-lg font-semibold mb-3">
        Additional Permissions Required
      </h2>
      
      <div className="p-4 mb-4 text-sm bg-blue-50 text-blue-700 border border-blue-100 rounded-md">
        To access your Facebook videos and reels, the following permissions are needed:
        <ul className="pl-5 mt-2 list-disc">
          {missingPermissions.includes('user_videos') && (
            <li><strong>Videos</strong> - Access to your videos</li>
          )}
          {missingPermissions.includes('user_posts') && (
            <li><strong>Posts</strong> - Access to posts that may contain videos</li>
          )}
        </ul>
      </div>
      
      {error && (
        <div className="p-4 mb-4 text-sm bg-red-50 text-red-700 border border-red-100 rounded-md">
          {error}
        </div>
      )}
      
      <button 
        className={`px-4 py-2 rounded-md text-white ${isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
        disabled={isLoading}
        onClick={handleRequestPermissions}
      >
        {isLoading ? 'Requesting...' : 'Grant Permissions'}
      </button>
      
      <p className="mt-4 text-sm text-gray-500">
        You'll be redirected to Facebook to approve these permissions.
        This helps us find and display your real estate videos.
      </p>
      
      {debugInfo && (
        <div className="mt-6 p-3 border border-gray-200 rounded-md bg-gray-50">
          <details>
            <summary className="text-xs text-gray-500 cursor-pointer">Debug Information</summary>
            <div className="mt-2 text-xs font-mono text-gray-600">
              <p>Base URL: {debugInfo.baseUrl}</p>
              <p>App ID: {debugInfo.appId}</p>
              <p>Redirect URI: {debugInfo.redirectUri}</p>
              <p>This must match exactly what's configured in your Facebook Developer Console</p>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default FacebookPermissionRequest;
