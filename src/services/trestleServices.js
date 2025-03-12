import axios from 'axios';

// Cache token to avoid excessive requests
let cachedToken = null;
let tokenExpiration = null;

// Configurable retry settings
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms

/**
 * Fetches a Trestle API token with retry logic
 */
const getTrestleToken = async (retryCount = 0) => {
  try {
    // Return cached token if valid
    if (cachedToken && tokenExpiration && new Date() < tokenExpiration) {
      return cachedToken;
    }

    // Fetch new token
    // Use absolute URL in production for reliability
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? process.env.NEXT_PUBLIC_API_BASE_URL || window.location.origin 
      : '';
    
    const response = await axios.post(`${baseUrl}/api/token`, null, {
      headers: {
      'Cache-Control': 'no-cache',
      },
      // Add timeout for better error handling
      timeout: 8000
    });
    
    if (response.status === 200 && response.data?.access_token) {
      cachedToken = response.data.access_token;
      // Set expiration 1 hour from now or based on expires_in
      const expiresInMs = (response.data.expires_in || 3600) * 1000;
      tokenExpiration = new Date(Date.now() + expiresInMs - 60000); // 1 minute buffer
      return cachedToken;
    }
    
    throw new Error('Invalid token response');
  } catch (error) {
    console.error(`Error fetching Trestle token (attempt ${retryCount + 1}/${MAX_RETRIES}):`, error);
    
    // Retry logic
    if (retryCount < MAX_RETRIES - 1) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return getTrestleToken(retryCount + 1);
    }
    
    // All retries failed, clear cached token
    cachedToken = null;
    tokenExpiration = null;
    throw new Error('Failed to fetch Trestle token: Failed to fetch token');
  }
};

/**
 * Fetches properties based on filter criteria
 */
export const getPropertiesByFilter = async (filterQuery) => {
  try {
    const token = await getTrestleToken();
    const response = await axios.get(`https://api.trestle.house/v4/properties?${filterQuery}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    return {
      properties: response.data?.value || [],
      nextLink: response.data['@odata.nextLink'] || null
    };
  } catch (error) {
    console.error('Error in getPropertiesByFilter:', error);
    throw error;
  }
};

/**
 * Fetches the next page of properties using the nextLink URL
 */
export const getNextProperties = async (nextLink) => {
  try {
    const token = await getTrestleToken();
    const response = await axios.get(nextLink, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    return {
      properties: response.data?.value || [],
      nextLink: response.data['@odata.nextLink'] || null
    };
  } catch (error) {
    console.error('Error in getNextProperties:', error);
    throw error;
  }
};

/**
 * Fetches media URLs for a specific listing
 */
export const fetchMediaUrls = async (listingKey) => {
  try {
    const token = await getTrestleToken();
    const response = await axios.get(`https://api.trestle.house/v4/media?$filter=ResourceRecordKey eq '${listingKey}'`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    const mediaItems = response.data?.value || [];
    return mediaItems.map(item => item.MediaURL);
  } catch (error) {
    console.error(`Error fetching media for listing ${listingKey}:`, error);
    return [];  // Return empty array instead of throwing
  }
};

/**
 * Fetches detailed property information
 */
export const getPropertyDetails = async (listingKey) => {
  try {
    const token = await getTrestleToken();
    const response = await axios.get(`https://api.trestle.house/v4/properties?$filter=ListingKey eq '${listingKey}'`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    const properties = response.data?.value || [];
    return properties[0] || null;
  } catch (error) {
    console.error(`Error fetching details for listing ${listingKey}:`, error);
    throw error;
  }
};

export default {
  getPropertiesByFilter,
  getNextProperties,
  fetchMediaUrls,
  getPropertyDetails
};