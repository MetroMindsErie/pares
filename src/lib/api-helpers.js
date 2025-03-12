import axios from 'axios';
import supabase from './supabase-setup';

/**
 * Get authorization headers for authenticated API requests
 * @returns {Promise<Object>} Headers object with authorization token
 */
export async function getAuthHeaders() {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    
    if (!token) {
      throw new Error('No authentication token available');
    }
    
    return {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
  } catch (error) {
    console.error('Error getting auth headers:', error);
    return { headers: {} };
  }
}

/**
 * Helper function to handle API errors
 * @param {Error} error - The caught error
 * @param {string} defaultMessage - Default message to show
 * @returns {Object} Error object with message and code
 */
export function handleApiError(error, defaultMessage = 'An error occurred') {
  console.error('API error:', error);
  
  // Extract error message from various error formats
  const message = 
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.message ||
    defaultMessage;
    
  // Extract status code
  const statusCode = error.response?.status || 500;
  
  return {
    message,
    statusCode
  };
}

/**
 * Make an authenticated request to an API endpoint
 */
export const authenticatedRequest = async (method, url, data = null) => {
  const headers = await getAuthHeaders();
  
  const config = {
    method,
    url,
    ...headers,
  };
  
  if (data && (method === 'post' || method === 'put' || method === 'patch')) {
    config.data = data;
  }
  
  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`API request error (${url}):`, error);
    throw error;
  }
};

/**
 * Check user's social connections status
 */
export const checkSocialConnections = async () => {
  try {
    const authConfig = await getAuthHeaders();
    const response = await axios.get('/api/user/social-connections', authConfig);
    return response.data || { facebook: false };
  } catch (error) {
    console.error('Error checking social connections:', error);
    return { facebook: false };
  }
};
