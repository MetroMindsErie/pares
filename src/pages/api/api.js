// Import axios or any other HTTP client you are using for making API calls
import axios from 'axios';

// Set up the Trestle client (assuming you are using a token-based authentication)
let client = null;

// Function to get the Trestle API token
const fetchToken = async () => {
  try {
    const response = await axios.post('YOUR_TRESTLE_API_TOKEN_URL', {
      // Add the necessary authentication data (client id, secret, etc.)
      client_id: 'YOUR_CLIENT_ID',
      client_secret: 'YOUR_CLIENT_SECRET',
      grant_type: 'client_credentials',
    });
    return response.data.access_token;
  } catch (error) {
    console.error('Error fetching token:', error);
    throw new Error('Unable to fetch token');
  }
};

// Initialize the Trestle client
const initializeClient = async () => {
  const token = await fetchToken();

  client = axios.create({
    baseURL: process.env.NEXT_PUBLIC_TRESTLE_BASE_URL, // Base URL for Trestle API
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
};

// Fetch property data based on various filters
export const fetchPropertyData = async (
  fields = ['ListingKey', 'BathroomsTotalInteger', 'StandardStatus', 'UnparsedAddress', 'ListAgentFirstName', 'BedroomsTotal', 'PropertyType', 'Media'],
  expand = [],
  queryParams = {}
) => {
  try {
    // Ensure the client is initialized
    if (!client) {
      await initializeClient(); // Initialize the client if it's not set
    }

    let url = `/trestle/odata/Property?$select=${fields.join(',')}`;

    // Apply filters based on queryParams
    if (queryParams.type) {
      url += `&PropertyType eq '${queryParams.type}'`;
    }
    if (queryParams.zipCode) {
      url += `&ZipCode eq '${queryParams.zipCode}'`;
    }
    if (queryParams.budget) {
      if (queryParams.budget === 'low') {
        url += `&Price le 200000`;
      } else if (queryParams.budget === 'medium') {
        url += `&Price ge 200000 and Price le 500000`;
      } else if (queryParams.budget === 'high') {
        url += `&Price ge 500000`;
      }
    }
    if (queryParams.location) {
      const { lat, lng } = queryParams.location;
      url += `&Latitude eq ${lat}&Longitude eq ${lng}`;
    }

    // Add pagination if nextLink exists (useful for infinite scrolling)
    if (queryParams.nextLink) {
      url = queryParams.nextLink;
    }

    // Make the API call to fetch data
    const response = await client.get(url);

    const properties = response.data.value || [];
    const newNextLink = response.data['@odata.nextLink'] || null;

    return { properties, newNextLink };
  } catch (error) {
    console.error('Error fetching property data:', error.message);
    return { properties: [], newNextLink: null };
  }
};

