import axios from 'axios';

/**
 * Fetches a user's profile picture from Facebook Graph API
 * @param {string} facebookId - The Facebook user ID
 * @param {string} accessToken - The access token for Facebook API
 * @param {string} size - Size of the image (small, normal, large, square)
 * @returns {Promise<string>} URL of the profile picture or null if error
 */
export async function getFacebookProfilePicture(facebookId, accessToken, size = 'large') {
  try {
    if (!facebookId || !accessToken) {
      console.warn('Missing Facebook ID or access token');
      return null;
    }

    // First try to get the picture directly with the token
    try {
      const response = await axios.get(
        `https://graph.facebook.com/v16.0/${facebookId}/picture?type=${size}&redirect=false`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      
      if (response.data && response.data.data && !response.data.data.is_silhouette) {
        console.log('Successfully retrieved Facebook profile image');
        return response.data.data.url;
      }
    } catch (directError) {
      console.warn('Failed to get profile picture directly:', directError.message);
    }
    
    // Fallback: Try with fields parameter
    const fieldsResponse = await axios.get(
      `https://graph.facebook.com/v16.0/${facebookId}?fields=picture.type(${size})`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    
    if (fieldsResponse.data && 
        fieldsResponse.data.picture && 
        fieldsResponse.data.picture.data && 
        !fieldsResponse.data.picture.data.is_silhouette) {
      console.log('Successfully retrieved Facebook profile image using fields param');
      return fieldsResponse.data.picture.data.url;
    }
    
    console.warn('Facebook returned default silhouette image');
    return null;
  } catch (error) {
    console.error('Error fetching Facebook profile picture:', error);
    return null;
  }
}

/**
 * Validates if a given URL is accessible and returns image data
 * @param {string} url - The image URL to validate
 * @returns {Promise<boolean>} Whether the URL is a valid image
 */
export async function validateImageUrl(url) {
  if (!url) return false;
  
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const contentType = response.headers.get('content-type');
    return response.ok && contentType && contentType.startsWith('image/');
  } catch (error) {
    console.warn('Image validation failed:', error);
    return false;
  }
}
