import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/auth-context';
import supabase from '../lib/supabase-setup';
import { getFacebookToken, checkRequiredPermissions, requestAdditionalPermissions } from '../services/facebookService';
import FacebookPermissionRequest from '../components/FacebookPermissionRequest';

export default function FacebookPermissions() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [missingPermissions, setMissingPermissions] = useState([]);
  const [hasRequiredPermissions, setHasRequiredPermissions] = useState(false);

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

  // Determine which user ID to use - prioritize context, then session
  const effectiveUserId = user?.id || sessionUser?.id;

  useEffect(() => {
    async function checkPermissions() {
      if (!effectiveUserId) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Get Facebook token
        const tokenResult = await getFacebookToken(effectiveUserId);
        
        if (!tokenResult?.accessToken) {
          setError('No Facebook token found. Please reconnect your Facebook account.');
          setLoading(false);
          return;
        }
        
        // Check permissions
        const permResult = await checkRequiredPermissions(tokenResult.accessToken);
        
        setPermissions(permResult.permissionsData || []);
        setMissingPermissions(permResult.missingPermissions || []);
        setHasRequiredPermissions(permResult.hasRequired);
        
        setLoading(false);
      } catch (err) {
        console.error('Error checking permissions:', err);
        setError('Failed to check Facebook permissions');
        setLoading(false);
      }
    }
    
    checkPermissions();
  }, [effectiveUserId]);
  
  const handleRequestPermissions = async () => {
    // Use the FacebookPermissionRequest component's functionality
    const result = await requestAdditionalPermissions();
    
    if (result.success && result.permissionUrl) {
      // Store current location to return after permission grant
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('returnAfterPermission', window.location.pathname);
      }
      
      // Redirect to Facebook permission dialog
      window.location.href = result.permissionUrl;
    } else {
      setError('Could not generate permission request URL');
    }
  };
  
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">
        Facebook Permissions Debug
      </h1>
      
      {!effectiveUserId && (
        <div className="p-4 mb-6 bg-yellow-50 text-yellow-700 border border-yellow-100 rounded-md">
          Please log in to check your Facebook permissions.
        </div>
      )}
      
      {error && (
        <div className="p-4 mb-6 bg-red-50 text-red-700 border border-red-100 rounded-md">
          {error}
        </div>
      )}
      
      {loading ? (
        <p>Checking permissions...</p>
      ) : (
        <>
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-lg font-semibold mb-3">
              Permission Status
            </h2>
            
            {hasRequiredPermissions ? (
              <div className="p-4 mb-4 bg-green-50 text-green-700 border border-green-100 rounded-md">
                Your account has the required permissions to access videos!
              </div>
            ) : (
              <>
                <div className="p-4 mb-4 bg-yellow-50 text-yellow-700 border border-yellow-100 rounded-md">
                  Missing required permissions to access videos. You need either 'user_videos' or 'user_posts'.
                </div>
                
                <FacebookPermissionRequest 
                  missingPermissions={missingPermissions} 
                  onComplete={() => window.location.reload()}
                />
              </>
            )}
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3">
              Current Permissions
            </h2>
            
            {permissions.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {permissions.map((perm, i) => (
                  <li key={perm.permission} className="py-3">
                    <div className="font-medium">{perm.permission}</div>
                    <div className="text-sm text-gray-500">Status: {perm.status}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No permissions found</p>
            )}
            
            <div className="mt-6">
              <button 
                className="px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50"
                onClick={handleRequestPermissions}
              >
                Request All Permissions Again
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
