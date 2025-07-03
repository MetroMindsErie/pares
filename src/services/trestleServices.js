// /services/trestleService.js
import axios from 'axios';

const API_BASE_URL = 'https://api-trestle.corelogic.com';

export const fetchToken = async () => {
  try {
    const response = await axios.post('/api/token');
    return response.data.access_token;
  } catch (error) {
    console.error('Error fetching token:', error);
    throw new Error('Failed to fetch token');
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
// export const getNextProperties = async (nextLink) => {
//   try {
//     const response = await fetch(nextLink, {
//       headers: {
//         Authorization: `Bearer ${await fetchToken()}`,
//         Accept: 'application/json'
//       }
//     });

//     if (!response.ok) throw new Error('Failed to fetch properties');

//     const data = await response.json();
//     const properties = Array.isArray(data.value) ? data.value : [];
//     return {
//       properties: properties.map(property => ({
//         ...property,
//         media: property.Media?.[0]?.MediaURL || '/fallback-property.jpg'
//       })),
//       nextLink: data['@odata.nextLink'] || null
//     };
//   } catch (error) {
//     console.error('Error in getNextProperties:', error);
//     throw error;
//   }
// };

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

  // Trestle API integration for property search

export const searchProperties = async (searchParams) => {
  try {
    // Convert searchParams to URL parameters for the API
    const queryParams = new URLSearchParams();
    
    // Map frontend parameters to API parameters
    if (searchParams.location) {
      // Handle location search - this could be city, zip, address, etc.
      queryParams.append('location', searchParams.location);
    }
    
    if (searchParams.minPrice) queryParams.append('minPrice', searchParams.minPrice);
    if (searchParams.maxPrice) queryParams.append('maxPrice', searchParams.maxPrice);
    if (searchParams.beds) queryParams.append('beds', searchParams.beds);
    if (searchParams.baths) queryParams.append('baths', searchParams.baths);
    if (searchParams.propertyType) queryParams.append('propertyType', searchParams.propertyType);
    if (searchParams.minSqFt) queryParams.append('minSqFt', searchParams.minSqFt);
    if (searchParams.maxSqFt) queryParams.append('maxSqFt', searchParams.maxSqFt);
    
    const apiUrl = `/api/properties?${queryParams.toString()}`;
    console.log('Searching properties with params:', apiUrl);
    
    const response = await fetch(apiUrl);
    
    // Handle non-OK responses
    if (!response.ok) {
      // Try to parse the error response as JSON
      let errorMessage = `API error: ${response.status}`;
      try {
        const errorData = await response.json().catch(() => ({}));
        console.error('API error details:', errorData);
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (parseError) {
        console.error('Could not parse error response as JSON');
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    
    // Check if the expected data structure is returned
    if (!data.value) {
      console.warn('API returned unexpected data structure:', data);
      return {
        properties: [],
        nextLink: null
      };
    }
    
    return {
      properties: data.value,
      nextLink: data['@odata.nextLink'] || null
    };
  } catch (error) {
    console.error('Error searching properties:', error);
    throw error;
  }
};

export const getNextProperties = async (nextLink) => {
  try {
    if (!nextLink) return { properties: [], nextLink: null };
    
    // Extract the query part from the next link
    const urlParts = nextLink.split('?');
    if (urlParts.length < 2) {
      throw new Error('Invalid next link format');
    }
    
    const apiUrl = `/api/properties?${urlParts[1]}`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      properties: data.value || [],
      nextLink: data['@odata.nextLink'] || null
    };
  } catch (error) {
    console.error('Error fetching next properties:', error);
    throw error;
  }
};