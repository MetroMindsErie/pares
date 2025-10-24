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
        params: { 
          $filter: `ListingKey eq '${listingKey}'`,
          $expand: 'Media,SaleHistory'  // Include sale history if available
        },
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
        params: { 
          $filter: `ListingKey eq '${listingKey}'`,
          $expand: 'Media,SaleHistory'  // Include sale history if available
        },
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
      properties: properties.map(property => {
        // Sort Media array by Order, fallback to original order
        let mediaArray = [];
        if (property.Media && Array.isArray(property.Media) && property.Media.length > 0) {
          mediaArray = property.Media
            .slice()
            .sort((a, b) => {
              if (a.Order !== undefined && b.Order !== undefined) {
                return a.Order - b.Order;
              }
              return 0;
            })
            .map(mediaItem => mediaItem.MediaURL)
            .filter(url => !!url);
        }
        // Always set media to the first image in the array
        return {
          ...property,
          media: mediaArray.length > 0 ? mediaArray[0] : '/fallback-property.jpg',
          mediaArray: mediaArray
        };
      }),
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
    const filters = [];
    
    // Handle location search (county, zip, or address)
    if (searchParams.location) {
      const location = searchParams.location.trim();
      
      // Check if it's a zip code (5 digits)
      if (/^\d{5}$/.test(location)) {
        filters.push(`PostalCode eq '${location}'`);
      } else {
        // Search in multiple fields for county or address
        filters.push(
          `(contains(tolower(City), tolower('${location}')) or ` +
          `contains(tolower(CountyOrParish), tolower('${location}')) or ` +
          `contains(tolower(UnparsedAddress), tolower('${location}')))`
        );
      }
    }
    
    // Handle status filter - ONLY add if explicitly provided
    if (searchParams.status && searchParams.status !== '') {
      filters.push(`StandardStatus eq '${searchParams.status}'`);
      console.log('Filtering by status:', searchParams.status); // Debug log
    } else {
      console.log('No status filter applied - showing all statuses'); // Debug log
    }
    
    // Handle price range
    if (searchParams.minPrice) {
      filters.push(`ListPrice ge ${searchParams.minPrice}`);
    }
    
    if (searchParams.maxPrice) {
      filters.push(`ListPrice le ${searchParams.maxPrice}`);
    }
    
    // Handle bedrooms
    if (searchParams.beds) {
      filters.push(`BedroomsTotal ge ${searchParams.beds}`);
    }
    
    // Handle bathrooms
    if (searchParams.baths) {
      filters.push(`BathroomsTotalInteger ge ${searchParams.baths}`);
    }
    
    // Property type filter
    if (searchParams.propertyType) {
      filters.push(`PropertyType eq '${searchParams.propertyType}'`);
    }

    // Square footage filters
    if (searchParams.minSqFt) {
      filters.push(`LivingArea ge ${searchParams.minSqFt}`);
    }
    if (searchParams.maxSqFt) {
      filters.push(`LivingArea le ${searchParams.maxSqFt}`);
    }

    // Build the filter query string - just the filter part
    const filterQuery = filters.length > 0 ? `$filter=${filters.join(' and ')}` : '';
    
    console.log('Final filter query:', filterQuery); // Debug log

    // Call getPropertiesByFilter with just the filter and let it handle top/skip/expand
    const response = await getPropertiesByFilter(filterQuery, 50, 0);
    
    console.log('Number of properties returned:', response.properties.length); // Debug log
    console.log('Sample property statuses:', response.properties.slice(0, 3).map(p => ({ 
      address: p.UnparsedAddress, 
      status: p.StandardStatus 
    }))); // Debug log
    
    // Format properties for the swiper and sort by price (least to most expensive)
    const formattedProperties = response.properties
      .map(property => ({
        ...property,
        media: property.media, // always first image
        mediaArray: property.mediaArray // all images
      }))
      .sort((a, b) => {
        const priceA = a.ListPrice || 0;
        const priceB = b.ListPrice || 0;
        return priceA - priceB; // Sort ascending (least to most expensive)
      });

    return {
      properties: formattedProperties,
      nextLink: response.nextLink,
      total: formattedProperties.length
    };

  } catch (error) {
    console.error('Error searching properties:', error);
    throw new Error('Failed to search properties');
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
    const properties = Array.isArray(data.value) ? data.value : [];
    return {
      properties: properties.map(property => {
        let mediaArray = [];
        if (property.Media && Array.isArray(property.Media) && property.Media.length > 0) {
          mediaArray = property.Media
            .slice()
            .sort((a, b) => {
              if (a.Order !== undefined && b.Order !== undefined) {
                return a.Order - b.Order;
              }
              return 0;
            })
            .map(mediaItem => mediaItem.MediaURL)
            .filter(url => !!url);
        }
        return {
          ...property,
          media: mediaArray.length > 0 ? mediaArray[0] : '/fallback-property.jpg',
          mediaArray: mediaArray
        };
      }),
      nextLink: data['@odata.nextLink'] || null
    };
  } catch (error) {
    console.error('Error fetching next properties:', error);
    throw error;
  }
};

// In the property processing function, ensure media is properly structured
const processProperty = (property) => {
  // Ensure media array is properly ordered with display image first
  if (property.Media && Array.isArray(property.Media)) {
    // Sort media to ensure the main/featured image comes first
    property.media = property.Media.sort((a, b) => {
      // If there's an Order field, use it
      if (a.Order !== undefined && b.Order !== undefined) {
        return a.Order - b.Order;
      }
      // Otherwise maintain original order (first is primary)
      return 0;
    }).map(mediaItem => mediaItem.MediaURL || mediaItem.url || mediaItem);
  } else if (property.Media) {
    property.media = [property.Media];
  }
};