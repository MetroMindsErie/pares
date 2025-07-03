import { NextResponse } from 'next/server';

// Helper function to get Trestle OAuth token
async function getTrestleToken() {
  const tokenUrl = process.env.NEXT_PUBLIC_TRESTLE_TOKEN_URL;
  const clientId = process.env.NEXT_PUBLIC_TRESTLE_CLIENT_ID;
  const clientSecret = process.env.NEXT_PUBLIC_TRESTLE_CLIENT_SECRET;
  
  if (!tokenUrl || !clientId || !clientSecret) {
    throw new Error('Trestle API credentials not configured properly');
  }
  
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  
  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token request failed:', errorText);
      throw new Error(`Failed to get Trestle token: ${response.status}`);
    }
    
    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error getting Trestle token:', error);
    throw error;
  }
}

export async function GET(request) {
  try {
    // Get search parameters from the request URL
    const { searchParams } = new URL(request.url);
    
    // Log the search parameters to help with debugging
    console.log('Search parameters:', Object.fromEntries(searchParams.entries()));
    
    // Check if we're in development mode
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Configure Trestle API credentials using the correct environment variables
    const trestleBaseUrl = process.env.NEXT_PUBLIC_TRESTLE_BASE_URL;
    
    if (!trestleBaseUrl) {
      console.error('Trestle API base URL not configured');
      return NextResponse.json(
        { error: 'Trestle API credentials are missing or invalid.' }, 
        { status: 500 }
      );
    }
    
    // Format the search parameters for Trestle API
    const formattedParams = new URLSearchParams();
    
    // Enhanced location search using Trestle-specific fields
    if (searchParams.has('location')) {
      const locationTerm = searchParams.get('location');
      
      // Check if the location search is potentially a postal code (ZIP code)
      if (/^\d{5}(-\d{4})?$/.test(locationTerm)) {
        // If it looks like a ZIP code (5 digits or ZIP+4 format)
        formattedParams.append('$filter', `startswith(PostalCode,'${locationTerm}')`);
      } 
      // Check if the location might be a city name
      else if (isNaN(locationTerm)) {
        // Use both PostalCity and UnparsedAddress for broader results
        formattedParams.append('$filter', 
          `contains(PostalCity,'${locationTerm}') or contains(UnparsedAddress,'${locationTerm}')`);
      } 
      // Fallback to general address search
      else {
        formattedParams.append('$filter', `contains(UnparsedAddress,'${locationTerm}')`);
      }
    } else if (searchParams.has('q')) {
      const searchTerm = searchParams.get('q');
      
      // Same logic for the 'q' parameter
      if (/^\d{5}(-\d{4})?$/.test(searchTerm)) {
        formattedParams.append('$filter', `startswith(PostalCode,'${searchTerm}')`);
      } else if (isNaN(searchTerm)) {
        formattedParams.append('$filter', 
          `contains(PostalCity,'${searchTerm}') or contains(UnparsedAddress,'${searchTerm}')`);
      } else {
        formattedParams.append('$filter', `contains(UnparsedAddress,'${searchTerm}')`);
      }
    }
    
    // Map price filters to OData format
    if (searchParams.has('minPrice')) {
      const currentFilter = formattedParams.get('$filter') || '';
      const priceFilter = `ListPrice ge ${searchParams.get('minPrice')}`;
      formattedParams.set('$filter', currentFilter ? `${currentFilter} and ${priceFilter}` : priceFilter);
    }
    
    if (searchParams.has('maxPrice')) {
      const currentFilter = formattedParams.get('$filter') || '';
      const priceFilter = `ListPrice le ${searchParams.get('maxPrice')}`;
      formattedParams.set('$filter', currentFilter ? `${currentFilter} and ${priceFilter}` : priceFilter);
    }
    
    // Map beds filter to OData format
    if (searchParams.has('beds')) {
      const currentFilter = formattedParams.get('$filter') || '';
      const bedsFilter = `BedroomsTotal ge ${searchParams.get('beds')}`;
      formattedParams.set('$filter', currentFilter ? `${currentFilter} and ${bedsFilter}` : bedsFilter);
    }
    
    // Map baths filter to OData format
    if (searchParams.has('baths')) {
      const currentFilter = formattedParams.get('$filter') || '';
      const bathsFilter = `BathroomsTotalInteger ge ${searchParams.get('baths')}`;
      formattedParams.set('$filter', currentFilter ? `${currentFilter} and ${bathsFilter}` : bathsFilter);
    }
    
    // Add standard status filter for active listings
    const currentFilter = formattedParams.get('$filter') || '';
    const statusFilter = `StandardStatus eq 'Active'`;
    formattedParams.set('$filter', currentFilter ? `${currentFilter} and ${statusFilter}` : statusFilter);
    
    // Add other standard parameters
    formattedParams.append('$top', '20'); // Limit results
    formattedParams.append('$expand', 'Media'); // Include media/images
    
    // Build the Trestle API URL with formatted parameters
    // The API endpoint should be the "Property" resource
    const trestleUrl = `${trestleBaseUrl}/trestle/odata/Property?${formattedParams.toString()}`;
    
    console.log('Fetching from Trestle API:', trestleUrl);
    
    try {
      // Get OAuth token for Trestle API
      const token = await getTrestleToken();
      console.log('Successfully obtained Trestle API token');
      
      // Make the request to the Trestle API with the token
      const response = await fetch(trestleUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        cache: 'no-store' // Disable caching to always get fresh data
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Trestle API error status:', response.status);
        console.error('Trestle API error body:', errorText);
        
        // In development, return mock data when the API fails
        if (isDevelopment) {
          console.log('Falling back to mock data in development');
          return NextResponse.json({
            value: getMockListings(searchParams),
            '@odata.nextLink': null
          });
        }
        
        return NextResponse.json(
          { error: `Trestle API error: ${response.status}`, details: errorText },
          { status: response.status }
        );
      }
      
      // Process the response
      const data = await response.json();
      console.log('Trestle API response received, count:', data.value?.length || 0);
      
      // Map the response to include property images and format data
      const properties = (data.value || []).map(property => {
        // Find the primary property image if available
        const mediaUrl = property.Media && property.Media.length > 0
          ? property.Media[0].MediaURL
          : null;
          
        return {
          ListingKey: property.ListingKey || '',
          UnparsedAddress: property.UnparsedAddress || '',
          StandardStatus: property.StandardStatus || '',
          BedroomsTotal: property.BedroomsTotal || 0,
          BathroomsTotalInteger: property.BathroomsTotalInteger || 0,
          LivingAreaSqFt: property.LivingArea?.SquareFeet || 0,
          ListPrice: property.ListPrice || 0,
          PropertyType: property.PropertyType || '',
          media: mediaUrl,
          
          // Additional Trestle-specific fields
          MlsStatus: property.MlsStatus,
          PublicRemarks: property.PublicRemarks,
          YearBuilt: property.YearBuilt,
          Latitude: property.Latitude,
          Longitude: property.Longitude,
        };
      });
      
      // Return the formatted response
      return NextResponse.json({
        value: properties,
        '@odata.nextLink': data['@odata.nextLink']
      });
      
    } catch (apiError) {
      console.error('Error fetching from Trestle API:', apiError);
      
      // In development, return mock data when the API fails
      if (isDevelopment) {
        console.log('Falling back to mock data in development due to API error');
        return NextResponse.json({
          value: getMockListings(searchParams),
          '@odata.nextLink': null
        });
      }
      
      throw apiError; // Re-throw to be caught by the outer try/catch
    }
    
  } catch (error) {
    console.error('Server error in properties API route:', error);
    
    // In development, return mock data on server error
    if (process.env.NODE_ENV === 'development') {
      try {
        const { searchParams } = new URL(request.url);
        console.log('Using mock data due to server error');
        return NextResponse.json({
          value: getMockListings(searchParams),
          '@odata.nextLink': null
        });
      } catch (mockError) {
        console.error('Error generating mock data:', mockError);
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch properties. Please try again later.' },
      { status: 500 }
    );
  }
}

// Helper function to generate mock listings for development
function getMockListings(searchParams) {
  // Extract search parameters to filter mock data
  const location = searchParams?.get('q') || '';
  const minPrice = parseInt(searchParams?.get('ListPrice.gte') || '0');
  const maxPrice = parseInt(searchParams?.get('ListPrice.lte') || '10000000');
  const minBeds = parseInt(searchParams?.get('BedroomsTotal.gte') || '0');
  const minBaths = parseInt(searchParams?.get('BathroomsTotalInteger.gte') || '0');
  
  // Base mock listings
  const mockListings = [
    // ...existing mock listings...
    {
      ListingKey: "mock-listing-1",
      UnparsedAddress: "123 Main St, Erie, PA 16501",
      StandardStatus: "Active",
      BedroomsTotal: 3,
      BathroomsTotalInteger: 2,
      LivingAreaSqFt: 1850,
      ListPrice: 275000,
      PropertyType: "SingleFamilyResidence",
      media: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80",
      MlsStatus: "Active",
      PublicRemarks: "Beautiful single family home in the heart of Erie",
      YearBuilt: 1985
    },
    {
      ListingKey: "mock-listing-2",
      UnparsedAddress: "456 Lake View Dr, Warren, PA 16365",
      StandardStatus: "Active",
      BedroomsTotal: 4,
      BathroomsTotalInteger: 3,
      LivingAreaSqFt: 2200,
      ListPrice: 349000,
      PropertyType: "SingleFamilyResidence",
      media: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80",
      MlsStatus: "Active",
      PublicRemarks: "Spacious family home with beautiful lake views",
      YearBuilt: 2005
    },
    {
      ListingKey: "mock-listing-4",
      UnparsedAddress: "101 Pine Street, Erie, PA 16504",
      StandardStatus: "Active",
      BedroomsTotal: 5,
      BathroomsTotalInteger: 4,
      LivingAreaSqFt: 3200,
      ListPrice: 525000,
      PropertyType: "SingleFamilyResidence",
      media: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1175&q=80",
      MlsStatus: "Active",
      PublicRemarks: "Luxury home in Erie's most desirable neighborhood",
      YearBuilt: 2015
    }
  ];
  
  // Filter the mock listings based on search parameters
  return mockListings.filter(listing => {
    // Filter by location (zipcode, city, or address)
    if (location && !listing.UnparsedAddress.toLowerCase().includes(location.toLowerCase())) {
      return false;
    }
    
    // Filter by price range
    if (listing.ListPrice < minPrice || (maxPrice > 0 && listing.ListPrice > maxPrice)) {
      return false;
    }
    
    // Filter by bedrooms
    if (listing.BedroomsTotal < minBeds) {
      return false;
    }
    
    // Filter by bathrooms
    if (listing.BathroomsTotalInteger < minBaths) {
      return false;
    }
    
    return true;
  });
}
