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
    // Input validation
    if (!facebookId || !accessToken) {
      console.warn('Missing Facebook ID or access token');
      return null;
    }

    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      console.warn('Facebook API calls should be made client-side');
      return null;
    }

    // First try to get the picture directly with the token
    try {
      const response = await axios.get(
        `https://graph.facebook.com/v16.0/${facebookId}/picture?type=${size}&redirect=false`,
        { 
          headers: { Authorization: `Bearer ${accessToken}` },
          timeout: 3000 // Add timeout to prevent hanging requests
        }
      );
      
      if (response.data && response.data.data && !response.data.data.is_silhouette) {
        console.log('Successfully retrieved Facebook profile image');
        return response.data.data.url;
      }
    } catch (directError) {
      console.warn('Failed to get profile picture directly:', directError.message);
    }
    
    // Fallback: Try with fields parameter
    try {
      const fieldsResponse = await axios.get(
        `https://graph.facebook.com/v16.0/${facebookId}?fields=picture.type(${size})`,
        { 
          headers: { Authorization: `Bearer ${accessToken}` },
          timeout: 3000 // Add timeout
        }
      );
      
      if (fieldsResponse.data && 
          fieldsResponse.data.picture && 
          fieldsResponse.data.picture.data && 
          !fieldsResponse.data.picture.data.is_silhouette) {
        console.log('Successfully retrieved Facebook profile image using fields param');
        return fieldsResponse.data.picture.data.url;
      }
    } catch (fieldsError) {
      console.warn('Failed to get profile picture using fields:', fieldsError.message);
    }
    
    // Last resort: Try to get profile picture without authentication
    try {
      // This URL will work even without authentication but may return a default image
      const publicUrl = `https://graph.facebook.com/${facebookId}/picture?type=${size}`;
      console.log('Using public Facebook profile image URL as fallback');
      return publicUrl;
    } catch (publicError) {
      console.warn('Failed to use public profile picture URL');
    }
    
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
  
  // Skip validation if we're not in a browser environment
  if (typeof window === 'undefined') return true;
  
  try {
    // Use a timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    // Try a HEAD request first for efficiency
    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      const contentType = response.headers.get('content-type');
      return response.ok && contentType && contentType.startsWith('image/');
    } catch (headError) {
      console.warn('HEAD request failed, falling back to image loading:', headError);
    }
    
    // Fallback: Try loading the image
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        clearTimeout(timeoutId);
        resolve(true);
      };
      img.onerror = () => {
        clearTimeout(timeoutId);
        resolve(false);
      };
      img.src = url;
    });
  } catch (error) {
    console.warn('Image validation failed:', error);
    return false;
  }
}

// Add a safer way to get Facebook profile pictures that doesn't require API access
export function getPublicFacebookProfilePicture(facebookId, size = 'large') {
  if (!facebookId) return null;
  return `https://graph.facebook.com/${facebookId}/picture?type=${size}`;
}
