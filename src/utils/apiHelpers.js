import axios from 'axios';
import querystring from 'querystring';

/**
 * Get Trestle API token in a way that works both client and server side
 */
export const getTrestleToken = async (isServerSide = false) => {
  try {
    // When running on the server, we need to fetch the token directly
    if (isServerSide) {
      // Use environment variables directly for server-side token request
      const tokenUrl = process.env.NEXT_PUBLIC_TRESTLE_TOKEN_URL;
      const tokenRequestData = {
        client_id: process.env.NEXT_PUBLIC_TRESTLE_CLIENT_ID,
        client_secret: process.env.NEXT_PUBLIC_TRESTLE_CLIENT_SECRET,
        grant_type: 'client_credentials',
        scope: 'api'
      };
      
      const response = await axios({
        method: 'post',
        url: tokenUrl,
        data: querystring.stringify(tokenRequestData),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      });
      
      return response.data.access_token;
    } 
    // Client-side, use the API route
    else {
      const response = await axios.post('/api/token');
      return response.data.access_token;
    }
  } catch (error) {
    console.error('Error getting Trestle token:', error);
    throw new Error(`Failed to get Trestle token: ${error.message}`);
  }
};

/**
 * Get property details by ID, handling token authentication
 */
export const getPropertyDetailsById = async (listingKey, isServerSide = false) => {
  try {
    const token = await getTrestleToken(isServerSide);
    
    // API base URL
    const apiBaseUrl = process.env.NEXT_PUBLIC_TRESTLE_BASE_URL || 'https://api-trestle.corelogic.com';
    
    // Fetch property details
    const propertyResponse = await axios.get(
      `${apiBaseUrl}/trestle/odata/Property`,
      {
        params: { 
          $filter: `ListingKey eq '${listingKey}'`,
          $expand: 'Media'  // Include media in the response
        },
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      }
    );
    
    if (!propertyResponse.data.value || propertyResponse.data.value.length === 0) {
      throw new Error('Property not found');
    }
    
    const property = propertyResponse.data.value[0];
    
    // Add the media URL if available
    if (property.Media && property.Media.length > 0) {
      property.mediaUrls = property.Media.map(media => media.MediaURL);
      property.featuredMedia = property.Media[0].MediaURL;
    } else {
      property.mediaUrls = [];
      property.featuredMedia = '/fallback-property.jpg';
    }
    
    return property;
  } catch (error) {
    console.error('Error getting property details:', error);
    throw error;
  }
};
