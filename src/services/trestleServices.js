// /services/trestleService.js
import axios from 'axios';

const API_BASE_URL = 'https://api-trestle.corelogic.com';

export async function getAccessToken() {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/trestle/oidc/connect/token`,
      new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'api',
        client_id: process.env.TRESTLE_CLIENT_ID,
        client_secret: process.env.TRESTLE_CLIENT_SECRET
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
}

export async function getPropertyById(listingKey, token) {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/trestle/odata/Property`,
      {
        params: { $filter: `ListingKey eq '${listingKey}'` },
        headers: {
          Authorization: `Bearer ${token}`,
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

export async function getPropertiesByFilter(filterQuery, token) {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/trestle/odata/Property`,
      {
        params: {
          $filter: filterQuery,
          $select:
            'ListingKey,UnparsedAddress,ListPrice,BedroomsTotal,BathroomsTotalInteger,Latitude,Longitude,Media',
          $top: 10
        },
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json'
        }
      }
    );
    return response.data.value;
  } catch (error) {
    console.error('Error fetching properties:', error);
    throw error;
  }
}

export async function getMediaUrls(listingKey, token) {
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
            Authorization: `Bearer ${token}`,
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
