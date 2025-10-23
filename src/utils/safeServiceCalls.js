/**
 * Utility to safely call external API services with proper error handling
 */

/**
 * Safely retrieves Facebook token with additional error protection
 * @param {Function} getFacebookTokenFunction - The actual function to get the token
 * @returns {Promise<string|null>} - The token or null if unavailable
 */
export const safeGetFacebookToken = async (getFacebookTokenFunction) => {
  // Check if user is authenticated by checking localStorage for Supabase session
  let isAuthenticated = false;
  try {
    const supabaseSession = localStorage.getItem('supabase.auth.token');
    isAuthenticated = !!supabaseSession;
  } catch (e) {
    console.warn('Could not check authentication status:', e);
  }

  // Don't try to get Facebook token if user is not authenticated
  if (!isAuthenticated) {

    return null;
  }

  try {
    return await getFacebookTokenFunction();
  } catch (error) {
    // Check if this is a logout situation
    if (error.message === 'Facebook token not found') {

      return null;
    }
    
    // Re-throw other errors
    throw error;
  }
};
```
