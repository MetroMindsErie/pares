/**
 * Helper functions for interacting with the Facebook API
 */

/**
 * Fetches a user's Facebook profile picture
 * 
 * @param {string} facebookId - The user's Facebook ID
 * @param {string} accessToken - Facebook access token
 * @param {string} size - Size of the profile picture (small, normal, large, square)
 * @returns {Promise<string|null>} The URL of the profile picture or null if error
 */
export async function getFacebookProfilePicture(facebookId, accessToken, size = 'large') {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v13.0/${facebookId}/picture?type=${size}&redirect=false&access_token=${accessToken}`
    );
    
    if (!response.ok) {
      throw new Error(`Facebook API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data?.url || null;
  } catch (error) {
    console.error('Error fetching Facebook profile picture:', error);
    return null;
  }
}

/**
 * Gets basic profile information from Facebook
 * 
 * @param {string} facebookId - The user's Facebook ID
 * @param {string} accessToken - Facebook access token
 * @returns {Promise<Object|null>} Basic Facebook profile data or null if error
 */
export async function getFacebookProfile(facebookId, accessToken) {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v13.0/${facebookId}?fields=name,first_name,last_name,email&access_token=${accessToken}`
    );
    
    if (!response.ok) {
      throw new Error(`Facebook API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching Facebook profile data:', error);
    return null;
  }
}
