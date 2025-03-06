import axios from 'axios';

const API_BASE_URL = 'https://api-trestle.corelogic.com';
let tokenCache = null;
let tokenExpiry = null;
let tokenRetryCount = 0;
const MAX_TOKEN_RETRIES = 3;

export const fetchToken = async () => {
  try {
    // Check if we have a cached token that's still valid (with 5-minute buffer)
    const now = Date.now();
    if (tokenCache && tokenExpiry && now < tokenExpiry - 300000) {
      console.log('Using cached Trestle token');
      return tokenCache;
    }
    
    // Reset retry count when requesting a new token
    if (tokenRetryCount >= MAX_TOKEN_RETRIES) {
      console.error(`Maximum token retry attempts (${MAX_TOKEN_RETRIES}) reached. Resetting counter.`);
      tokenRetryCount = 0;
    }

    console.log('Fetching new Trestle token...');
    const response = await axios.post('/api/token', {}, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.data || !response.data.access_token) {
      throw new Error('Token response did not contain an access_token');
    }
    
    // Cache the token with a default expiry of 1 hour if not specified
    tokenCache = response.data.access_token;
    tokenExpiry = now + (response.data.expires_in || 3600) * 1000;
    tokenRetryCount = 0; // Reset retry count on success
    
    console.log('Token retrieved successfully. Expires in:', response.data.expires_in);
    return tokenCache;
  } catch (error) {
    // Increment retry count
    tokenRetryCount++;
    
    console.error(`Error fetching Trestle token (attempt ${tokenRetryCount}/${MAX_TOKEN_RETRIES}):`, error);
    
    // Clear the cache on error
    tokenCache = null;
    tokenExpiry = null;
    
    if (error.response?.data?.suggestions) {
      console.error('Suggestions to fix the issue:');
      error.response.data.suggestions.forEach(suggestion => console.error(`- ${suggestion}`));
    }
    
    // If we haven't exceeded max retries, try again with a slight delay
    if (tokenRetryCount < MAX_TOKEN_RETRIES) {
      console.log(`Retrying token request (${tokenRetryCount}/${MAX_TOKEN_RETRIES})...`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
      return fetchToken();
    }
    
    throw new Error('Failed to fetch Trestle token: ' + (error.response?.data?.error || error.message));
  }
};

export async function getPropertyById(listingKey) {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/trestle/odata/Property`,
      {
        params: { $filter: `ListingKey eq '${listingKey}'` },
        headers: {
          Authorization: `Bearer ${await fetchToken()}`,
          Accept: 'application/json'
        }
      }
    );
    return response.data.value[0];
  } catch (error) {
    console.error('Error fetching property by id:', error);
    throw error;
  }
}

export async function getPropertyDetails(listingKey) {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/trestle/odata/Property`,
      {
        params: { $filter: `ListingKey eq '${listingKey}'` },
        headers: {
          Authorization: `Bearer ${await fetchToken()}`,
          Accept: 'application/json'
        }
      }
    );
    return response.data.value[0];
  } catch (error) {
    console.error('Error fetching property details:', error);
    throw error;
  }
}

// trestleServices.js
export const getPropertiesByFilter = async (filterQuery, top = 9, skip = 0) => {
  try {
    const response = await fetch(`${API_BASE_URL}/trestle/odata/Property?${filterQuery}&$top=${top}&$skip=${skip}&$expand=Media`, {
      headers: {
        Authorization: `Bearer ${await fetchToken()}`,
        Accept: 'application/json'
      }
    });

    if (!response.ok) throw new Error('Failed to fetch properties');

    const data = await response.json();
    const properties = Array.isArray(data.value) ? data.value : [];
    return {
      properties: properties.map(property => ({
        ...property,
        media: property.Media?.[0]?.MediaURL || '/fallback-property.jpg'
      })),
      nextLink: data['@odata.nextLink'] || null
    };
  } catch (error) {
    console.error('Error in getPropertiesByFilter:', error);
    throw error;
  }
};

// Function to fetch the next set of properties using the nextLink
export const getNextProperties = async (nextLink) => {
  try {
    const response = await fetch(nextLink, {
      headers: {
        Authorization: `Bearer ${await fetchToken()}`,
        Accept: 'application/json'
      }
    });

    if (!response.ok) throw new Error('Failed to fetch properties');

    const data = await response.json();
    const properties = Array.isArray(data.value) ? data.value : [];
    return {
      properties: properties.map(property => ({
        ...property,
        media: property.Media?.[0]?.MediaURL || '/fallback-property.jpg'
      })),
      nextLink: data['@odata.nextLink'] || null
    };
  } catch (error) {
    console.error('Error in getNextProperties:', error);
    throw error;
  }
};

export async function getMediaUrls(listingKey) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/trestle/odata/Media`,
        {
          params: {
            $filter: `ResourceRecordKey eq '${listingKey}' and MediaCategory eq 'Photo'`,
            $orderby: 'Order',
            $select: 'MediaURL'
          },
          headers: {
            Authorization: `Bearer ${await fetchToken()}`,
            Accept: 'application/json'
          }
        }
      );
  
      // Log the raw URL for debugging
      console.log("Raw Media URLs:", response.data.value);
  
      // If the API returns complete URLs, simply map over them:
      return response.data.value
        .map((media) => media.MediaURL)
        .filter(url => !!url);
    } catch (error) {
      console.error('Error fetching media URLs:', error);
      return [];
    }
  }

  export const fetchCountyNames = async () => {
    const response = await fetch('https://api-trestle.corelogic.com/trestle/odata/Lookup', {
      headers: {
        Authorization: `Bearer ${await fetchToken()}`
      }
    });
    const data = await response.json();
    const counties = data.value
      .filter(item => item.LookupType === 'CountyOrParish' && ['Erie', 'Crawford', 'Warren'].includes(item.LookupValue))
      .map(item => item.LookupValue);
    return counties;
  };

  export const fetchMediaUrls = async (listingKey) => {
    try {
      const response = await axios.get(
        `https://api-trestle.corelogic.com/trestle/odata/Media`,
        {
          params: {
            $filter: `ResourceRecordKey eq '${listingKey}'`,
            $orderby: 'Order',
            $select: 'MediaURL',
          },
          headers: {
            Authorization: `Bearer ${await fetchToken()}`,
            Accept: 'application/json',
          },
        }
      );
      return response.data.value.map((media) => media.MediaURL);
    } catch (error) {
      console.error('Error fetching media:', error);
      return [];
    }
  };