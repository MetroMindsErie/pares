import { edgeHandler } from '../../lib/edgeHandler';

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
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Token request failed:', errorText);
    throw new Error(`Failed to get Trestle token: ${response.status}`);
  }
  
  const data = await response.json();
  return data.access_token;
}

export default edgeHandler(async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const trestleBaseUrl = process.env.NEXT_PUBLIC_TRESTLE_BASE_URL;
    
    if (!trestleBaseUrl) {
      console.error('Trestle API base URL not configured');
      return res.status(500).json({ error: 'Trestle API credentials are missing or invalid.' });
    }
    
    const formattedParams = new URLSearchParams();
    let filters = [];
    const query = req.query;
    
    // Location search handling (ZIP, County, City)
    const locationTerm = (query.location || query.q || '').trim();
    if (locationTerm) {
      if (/^\d{5}(-\d{4})?$/.test(locationTerm)) {
        filters.push(`PostalCode eq '${locationTerm}'`);
      } else if (['erie', 'warren', 'crawford'].includes(locationTerm.toLowerCase())) {
        const countyName = locationTerm.charAt(0).toUpperCase() + locationTerm.slice(1).toLowerCase() + ' County';
        filters.push(`CountyOrParish eq '${countyName}'`);
      } else {
        filters.push(`(contains(CountyOrParish,'${locationTerm}') or contains(PostalCity,'${locationTerm}') or contains(UnparsedAddress,'${locationTerm}'))`);
      }
    }
    
    // ZIP code specific search
    if (query.zipCode) {
      const zipCode = query.zipCode.trim();
      if (zipCode) filters.push(`PostalCode eq '${zipCode}'`);
    }
    
    // Property type filter
    if (query.propertyType) {
      const propertyType = query.propertyType.trim();
      if (propertyType.toLowerCase() === 'residential') {
        filters.push(`(PropertyType eq 'Residential' or PropertyType eq 'Residential Lease')`);
      } else if (propertyType.toLowerCase() === 'commercial') {
        filters.push(`(PropertyType eq 'Commercial Sale' or PropertyType eq 'Commercial Lease')`);
      } else {
        filters.push(`PropertyType eq '${propertyType}'`);
      }
    }
    
    // Price range filters
    if (query.minPrice) {
      const minPrice = parseInt(query.minPrice);
      if (!isNaN(minPrice) && minPrice > 0) filters.push(`ListPrice ge ${minPrice}`);
    }
    if (query.maxPrice) {
      const maxPrice = parseInt(query.maxPrice);
      if (!isNaN(maxPrice) && maxPrice > 0) filters.push(`ListPrice le ${maxPrice}`);
    }
    
    // Bedroom filters
    if (query.beds) {
      const beds = parseInt(query.beds);
      if (!isNaN(beds)) {
        if (query.bedsExact === 'true') {
          filters.push(`BedroomsTotal eq ${beds}`);
        } else {
          filters.push(`BedroomsTotal ge ${beds}`);
        }
      }
    }
    
    // Bathroom filters
    if (query.baths) {
      const baths = parseInt(query.baths);
      if (!isNaN(baths)) {
        if (query.bathsExact === 'true') {
          filters.push(`BathroomsTotalInteger eq ${baths}`);
        } else {
          filters.push(`BathroomsTotalInteger ge ${baths}`);
        }
      }
    }
    
    // Status filter
    if (!query.status) {
      filters.push(`StandardStatus eq 'Active'`);
    } else {
      filters.push(`StandardStatus eq '${query.status}'`);
    }
    
    // Square footage filter
    if (query.minSqFt) {
      const minSqFt = parseInt(query.minSqFt);
      if (!isNaN(minSqFt) && minSqFt > 0) filters.push(`LivingArea/SquareFeet ge ${minSqFt}`);
    }
    
    // Lot size filter
    if (query.minLotSize) {
      const minLotSize = parseInt(query.minLotSize);
      if (!isNaN(minLotSize) && minLotSize > 0) filters.push(`LotSize/SquareFeet ge ${minLotSize}`);
    }
    
    // Combine all filters
    if (filters.length > 0) {
      formattedParams.append('$filter', filters.join(' and '));
    }
    
    const pageSize = query.pageSize || '20';
    formattedParams.append('$top', pageSize);
    formattedParams.append('$expand', 'Media');
    
    // Sorting
    if (query.sort) {
      switch (query.sort) {
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
    
    const trestleUrl = `${trestleBaseUrl}/trestle/odata/Property?${formattedParams.toString()}`;

    try {
      const token = await getTrestleToken();

      const response = await fetch(trestleUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Trestle API error status:', response.status);
        console.error('Trestle API error body:', errorText);
        
        if (isDevelopment) {
          return res.status(200).json({ value: getMockListings(query), '@odata.nextLink': null });
        }
        
        return res.status(response.status).json({ error: `Trestle API error: ${response.status}`, details: errorText });
      }
      
      const data = await response.json();

      const properties = (data.value || []).map(property => {
        let mediaUrl = null;
        if (property.Media && property.Media.length > 0) {
          const preferredPhoto = property.Media.find(media => 
            media.PreferredPhotoYN === true || 
            media.PreferredPhotoYN === 'Y' || 
            media.PreferredPhotoYN === 'Yes'
          );
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
      
      return res.status(200).json({ value: properties, '@odata.nextLink': data['@odata.nextLink'] });
      
    } catch (apiError) {
      console.error('Error fetching from Trestle API:', apiError);
      
      if (isDevelopment) {
        return res.status(200).json({ value: getMockListings(query), '@odata.nextLink': null });
      }
      
      throw apiError;
    }
    
  } catch (error) {
    console.error('Server error in properties API route:', error);
    
    if (process.env.NODE_ENV === 'development') {
      try {
        return res.status(200).json({ value: getMockListings(req.query), '@odata.nextLink': null });
      } catch (mockError) {
        console.error('Error generating mock data:', mockError);
      }
    }
    
    return res.status(500).json({ error: 'Failed to fetch properties. Please try again later.' });
  }
});

// Helper function to generate mock listings for development
function getMockListings(query) {
  const location = query?.location || query?.q || '';
  const minPrice = parseInt(query?.minPrice || '0');
  const maxPrice = parseInt(query?.maxPrice || '10000000');
  const beds = parseInt(query?.beds || '0');
  const baths = parseInt(query?.baths || '0');
  const propertyType = query?.propertyType || '';
  const zipCode = query?.zipCode || '';
  
  const mockProperties = [];
  const countyOptions = ['Erie County', 'Warren County', 'Crawford County'];
  const cityOptions = ['Erie', 'Warren', 'Meadville', 'Corry', 'Edinboro'];
  const zipOptions = ['16501', '16502', '16503', '16504', '16505', '16506'];
  const propertyTypeOptions = ['Residential', 'Commercial Sale', 'Residential Lease', 'Commercial Lease'];
  
  let filteredPropertyTypes = propertyTypeOptions;
  if (propertyType.toLowerCase() === 'residential') {
    filteredPropertyTypes = propertyTypeOptions.filter(type => 
      type === 'Residential' || type === 'Residential Lease');
  } else if (propertyType.toLowerCase() === 'commercial') {
    filteredPropertyTypes = propertyTypeOptions.filter(type => 
      type === 'Commercial Sale' || type === 'Commercial Lease');
  }
  
  for (let i = 0; i < 10; i++) {
    const mockPrice = Math.floor(Math.random() * 900000) + 100000;
    const mockBeds = Math.floor(Math.random() * 5) + 1;
    const mockBaths = Math.floor(Math.random() * 4) + 1;
    const mockSqFt = Math.floor(Math.random() * 3000) + 1000;
    const mockCounty = countyOptions[Math.floor(Math.random() * countyOptions.length)];
    const mockCity = cityOptions[Math.floor(Math.random() * cityOptions.length)];
    const mockZip = zipOptions[Math.floor(Math.random() * zipOptions.length)];
    const mockType = filteredPropertyTypes[Math.floor(Math.random() * filteredPropertyTypes.length)];
    
    if ((minPrice > 0 && mockPrice < minPrice) || 
        (maxPrice < 10000000 && mockPrice > maxPrice) ||
        (beds > 0 && mockBeds < beds) ||
        (baths > 0 && mockBaths < baths) ||
        (zipCode && mockZip !== zipCode)) {
      continue;
    }
    
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

export const runtime = 'edge';
