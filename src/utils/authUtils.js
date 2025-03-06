import axios from 'axios';

/**
 * Fetches the user token for a specific provider (e.g., Facebook)
 * @param {string} userId - The user ID
 * @param {string} provider - The authentication provider (default: 'facebook')
 * @returns {Promise<string>} - The access token
 */
export const fetchUserToken = async (userId, provider = 'facebook') => {
  try {
    const response = await axios.get(`/api/user-token`, {
      params: { user_id: userId, provider }
    });
    return response.data.token;
  } catch (error) {
    console.error(`Error fetching ${provider} token:`, error);
    throw new Error(`Failed to fetch ${provider} token`);
  }
};

/**
 * Stores a user token for a specific provider
 * @param {string} userId - The user ID
 * @param {string} accessToken - The access token to store
 * @param {string} providerUserId - The user ID from the provider
 * @param {string} provider - The authentication provider (default: 'facebook')
 * @returns {Promise<boolean>} - Success status
 */
export const storeUserToken = async (userId, accessToken, providerUserId, provider = 'facebook') => {
  try {
    const response = await axios.post(`/api/user-token`, {
      user_id: userId,
      access_token: accessToken,
      provider_user_id: providerUserId,
      provider
    });
    return response.data.success;
  } catch (error) {
    console.error(`Error storing ${provider} token:`, error);
    throw new Error(`Failed to store ${provider} token`);
  }
};
