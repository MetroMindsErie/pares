import axios from 'axios';
import supabase from './supabase-setup';

/**
 * Gets authenticated headers for API requests
 * @returns {Promise<{headers: {Authorization: string, Content-Type: string}, withCredentials: boolean}>}
 */
export async function getAuthHeaders() {
  // Get the current session
  const { data: { session } } = await supabase.auth.getSession();
  
  // Set up headers with the access token
  return {
    headers: {
      Authorization: session?.access_token ? `Bearer ${session.access_token}` : '',
      'Content-Type': 'application/json',
    },
    withCredentials: true
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
