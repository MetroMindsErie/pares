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

    const requestId = Math.random().toString(36).slice(2, 8);
    // Log the incoming search params (safe; no secrets expected here)
    console.log(`[TRESTLE:${requestId}] /api/properties params:`, Object.fromEntries(searchParams.entries()));
    
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
    let filters = [];
    
    // Location search handling (ZIP, County, City)
    if (searchParams.has('location') || searchParams.has('q')) {
      const locationTerm = (searchParams.get('location') || searchParams.get('q') || '').trim();
      
      if (locationTerm) {
        // Check if it's a ZIP code
        if (/^\d{5}(-\d{4})?$/.test(locationTerm)) {
          filters.push(`PostalCode eq '${locationTerm}'`);
        } 
        // Check for specific county names
        else if (['erie', 'warren', 'crawford'].includes(locationTerm.toLowerCase())) {
          const countyName = locationTerm.charAt(0).toUpperCase() + locationTerm.slice(1).toLowerCase() + ' County';
          filters.push(`CountyOrParish eq '${countyName}'`);
        }
        // General search
        else {
          filters.push(`(contains(CountyOrParish,'${locationTerm}') or contains(PostalCity,'${locationTerm}') or contains(UnparsedAddress,'${locationTerm}'))`);
        }
      }
    }
    
    // ZIP code specific search
    if (searchParams.has('zipCode')) {
      const zipCode = searchParams.get('zipCode').trim();
      if (zipCode) {
        filters.push(`PostalCode eq '${zipCode}'`);
      }
    }
    
    // Property type filter (residential or commercial)
    if (searchParams.has('propertyType')) {
      const propertyType = searchParams.get('propertyType').trim();
      if (propertyType.toLowerCase() === 'residential') {
        filters.push(`(PropertyType eq 'Residential' or PropertyType eq 'Residential Lease')`);
      } else if (propertyType.toLowerCase() === 'commercial') {
        filters.push(`(PropertyType eq 'Commercial Sale' or PropertyType eq 'Commercial Lease')`);
      } else {
        // If specific property type is provided, use it directly
        filters.push(`PropertyType eq '${propertyType}'`);
      }
    }
    
    // Price range filters
    if (searchParams.has('minPrice')) {
      const minPrice = parseInt(searchParams.get('minPrice'));
      if (!isNaN(minPrice) && minPrice > 0) {
        filters.push(`ListPrice ge ${minPrice}`);
      }
    }
    
    if (searchParams.has('maxPrice')) {
      const maxPrice = parseInt(searchParams.get('maxPrice'));
      if (!isNaN(maxPrice) && maxPrice > 0) {
        filters.push(`ListPrice le ${maxPrice}`);
      }
    }
    
    // Bedroom filters - support both exact and minimum
    if (searchParams.has('beds')) {
      const beds = parseInt(searchParams.get('beds'));
      if (!isNaN(beds)) {
        if (searchParams.has('bedsExact') && searchParams.get('bedsExact') === 'true') {
          filters.push(`BedroomsTotal eq ${beds}`);
        } else {
          filters.push(`BedroomsTotal ge ${beds}`);
        }
      }
    }
    
    // Bathroom filters - support both exact and minimum
    if (searchParams.has('baths')) {
      const baths = parseInt(searchParams.get('baths'));
      if (!isNaN(baths)) {
        if (searchParams.has('bathsExact') && searchParams.get('bathsExact') === 'true') {
          filters.push(`BathroomsTotalInteger eq ${baths}`);
        } else {
          filters.push(`BathroomsTotalInteger ge ${baths}`);
        }
      }
    }
    
    // Default status filter for active listings (unless overridden)
    if (!searchParams.has('status')) {
      filters.push(`StandardStatus eq 'Active'`);
    } else {
      const status = searchParams.get('status');
      filters.push(`StandardStatus eq '${status}'`);
    }
    
    // Square footage filter
    if (searchParams.has('minSqFt')) {
      const minSqFt = parseInt(searchParams.get('minSqFt'));
      if (!isNaN(minSqFt) && minSqFt > 0) {
        filters.push(`LivingArea/SquareFeet ge ${minSqFt}`);
      }
    }
    
    // Lot size filter
    if (searchParams.has('minLotSize')) {
      const minLotSize = parseInt(searchParams.get('minLotSize'));
      if (!isNaN(minLotSize) && minLotSize > 0) {
        filters.push(`LotSize/SquareFeet ge ${minLotSize}`);
      }
    }
    
    // Combine all filters with AND operator
    if (filters.length > 0) {
      formattedParams.append('$filter', filters.join(' and '));
    }
    
    // Add other standard parameters
    const pageSize = searchParams.get('pageSize') || '20';
    formattedParams.append('$top', pageSize); // Limit results
    formattedParams.append('$expand', 'Media'); // Include media/images
    
    // Add sorting options if specified
    if (searchParams.has('sort')) {
      const sortOption = searchParams.get('sort');
      switch (sortOption) {
        case 'price-asc':
          formattedParams.append('$orderby', 'ListPrice asc');
          break;
        case 'price-desc':
          formattedParams.append('$orderby', 'ListPrice desc');
          break;
        case 'newest':
          formattedParams.append('$orderby', 'ModificationTimestamp desc');
          break;
        default:
          formattedParams.append('$orderby', 'ListingKeyNumeric desc');
      }
    } else {
      formattedParams.append('$orderby', 'ListingKeyNumeric desc');
    }
    
    // Build the Trestle API URL with formatted parameters
    const trestleUrl = `${trestleBaseUrl}/trestle/odata/Property?${formattedParams.toString()}`;

    console.log(`[TRESTLE:${requestId}] GET ${trestleUrl}`);
    
    try {
      // Get OAuth token for Trestle API
      const token = await getTrestleToken();

      console.log(`[TRESTLE:${requestId}] token acquired (${token ? 'present' : 'missing'})`);
      
      // Make the request to the Trestle API with the token
      const response = await fetch(trestleUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        cache: 'no-store' // Disable caching to always get fresh data
      });

      console.log(`[TRESTLE:${requestId}] upstream status ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Trestle API error status:', response.status);
        console.error('Trestle API error body:', errorText);
        
        // In development, return mock data when the API fails
        if (isDevelopment) {

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

      console.log(`[TRESTLE:${requestId}] upstream results ${(data?.value?.length ?? 0)} nextLink ${data?.['@odata.nextLink'] ? 'present' : 'none'}`);
      
      // Map the response to include property images and format data
      const properties = (data.value || []).map(property => {
        // Try to find the preferred property image, otherwise use the first one
        let mediaUrl = null;
        
        if (property.Media && property.Media.length > 0) {
          // Look for preferred photo based on PreferredPhotoYN flag
          const preferredPhoto = property.Media.find(media => 
            media.PreferredPhotoYN === true || 
            media.PreferredPhotoYN === 'Y' || 
            media.PreferredPhotoYN === 'Yes'
          );
          
          // Use preferred photo if found, otherwise use first photo
          mediaUrl = preferredPhoto ? preferredPhoto.MediaURL : property.Media[0].MediaURL;
        }
          
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
          PostalCode: property.PostalCode,
          CountyOrParish: property.CountyOrParish,
          PostalCity: property.PostalCity
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
  const location = searchParams?.get('location') || searchParams?.get('q') || '';
  const minPrice = parseInt(searchParams?.get('minPrice') || '0');
  const maxPrice = parseInt(searchParams?.get('maxPrice') || '10000000');
  const beds = parseInt(searchParams?.get('beds') || '0');
  const baths = parseInt(searchParams?.get('baths') || '0');
  const propertyType = searchParams?.get('propertyType') || '';
  const zipCode = searchParams?.get('zipCode') || '';
  
  // Generate 10 mock properties
  const mockProperties = [];
  const countyOptions = ['Erie County', 'Warren County', 'Crawford County'];
  const cityOptions = ['Erie', 'Warren', 'Meadville', 'Corry', 'Edinboro'];
  const zipOptions = ['16501', '16502', '16503', '16504', '16505', '16506'];
  const propertyTypeOptions = ['Residential', 'Commercial Sale', 'Residential Lease', 'Commercial Lease'];
  
  // Filter the property type based on search parameters
  let filteredPropertyTypes = propertyTypeOptions;
  if (propertyType.toLowerCase() === 'residential') {
    filteredPropertyTypes = propertyTypeOptions.filter(type => 
      type === 'Residential' || type === 'Residential Lease');
  } else if (propertyType.toLowerCase() === 'commercial') {
    filteredPropertyTypes = propertyTypeOptions.filter(type => 
      type === 'Commercial Sale' || type === 'Commercial Lease');
  }
  
  for (let i = 0; i < 10; i++) {
    // Generate random property data
    const mockPrice = Math.floor(Math.random() * 900000) + 100000;
    const mockBeds = Math.floor(Math.random() * 5) + 1;
    const mockBaths = Math.floor(Math.random() * 4) + 1;
    const mockSqFt = Math.floor(Math.random() * 3000) + 1000;
    const mockCounty = countyOptions[Math.floor(Math.random() * countyOptions.length)];
    const mockCity = cityOptions[Math.floor(Math.random() * cityOptions.length)];
    const mockZip = zipOptions[Math.floor(Math.random() * zipOptions.length)];
    const mockType = filteredPropertyTypes[Math.floor(Math.random() * filteredPropertyTypes.length)];
    
    // Apply filters
    if ((minPrice > 0 && mockPrice < minPrice) || 
        (maxPrice < 10000000 && mockPrice > maxPrice) ||
        (beds > 0 && mockBeds < beds) ||
        (baths > 0 && mockBaths < baths) ||
        (zipCode && mockZip !== zipCode)) {
      // Skip this property if it doesn't match filters
      continue;
    }
    
    // Create the mock property
    mockProperties.push({
      ListingKey: `mock-${i}-${Date.now()}`,
      UnparsedAddress: `${100 + i} Main St, ${mockCity}, PA ${mockZip}`,
      StandardStatus: 'Active',
      BedroomsTotal: mockBeds,
      BathroomsTotalInteger: mockBaths,
      LivingAreaSqFt: mockSqFt,
      ListPrice: mockPrice,
      PropertyType: mockType,
      media: `https://picsum.photos/id/${(i + 10)}/800/600`,
      MlsStatus: 'Active',
      PublicRemarks: `Beautiful ${mockBeds} bedroom, ${mockBaths} bathroom home in ${mockCity}. This property features ${mockSqFt} square feet of living space.`,
      YearBuilt: Math.floor(Math.random() * 70) + 1950,
      Latitude: 42.0 + (Math.random() * 2),
      Longitude: -80.0 - (Math.random() * 2),
      PostalCode: mockZip,
      CountyOrParish: mockCounty,
      PostalCity: mockCity
    });
  }
  
  // Return at least some properties even if filters are strict
  if (mockProperties.length < 3) {
    for (let i = 0; i < 3; i++) {
      mockProperties.push({
        ListingKey: `mock-backup-${i}-${Date.now()}`,
        UnparsedAddress: `${200 + i} State St, Erie, PA 16501`,
        StandardStatus: 'Active',
        BedroomsTotal: beds > 0 ? beds : 3,
        BathroomsTotalInteger: baths > 0 ? baths : 2,
        LivingAreaSqFt: 1800,
        ListPrice: minPrice > 0 ? minPrice + 10000 : 250000,
        PropertyType: propertyType ? (propertyType.toLowerCase() === 'commercial' ? 'Commercial Sale' : 'Residential') : 'Residential',
        media: `https://picsum.photos/id/${(i + 20)}/800/600`,
        MlsStatus: 'Active',
        PublicRemarks: 'Mock property generated to ensure search results.',
        YearBuilt: 2000,
        Latitude: 42.1292,
        Longitude: -80.0851,
        PostalCode: zipCode || '16501',
        CountyOrParish: 'Erie County',
        PostalCity: 'Erie'
      });
    }
  }
  
  return mockProperties;
}
