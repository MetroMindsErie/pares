import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import axios from 'axios';

const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), { ssr: false });
const useMapEvents = dynamic(() => import('react-leaflet').then((mod) => mod.useMapEvents), { ssr: false });


// API configuration
const API_BASE_URL = 'https://api-trestle.corelogic.com';
const DEFAULT_RADIUS = 10; // miles

const SearchBar = ({ onSearchResults }) => {
  const [searchParams, setSearchParams] = useState({
    propertyType: '',
    priceMin: '',
    priceMax: '',
    beds: '',
    baths: '',
    sqftMin: '',
    sqftMax: '',
    locationType: 'zipcode',
    zipCode: '',
    coordinates: null,
    radius: DEFAULT_RADIUS
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showMap, setShowMap] = useState(false);

  const propertyTypes = [
    { value: 'Residential', label: 'Single Family Home' },
    { value: 'Condo', label: 'Condo' },
    { value: 'Townhouse', label: 'Townhouse' },
    { value: 'MultiFamily', label: 'Multi-Family' }
  ];

  const buildODataQuery = () => {
    const filters = [];
    
    // Property Type filter
    if (searchParams.propertyType) {
      filters.push(`PropertyType eq '${searchParams.propertyType}'`);
    }

    // Price range
    if (searchParams.priceMin) {
      filters.push(`ListPrice ge ${searchParams.priceMin}`);
    }
    if (searchParams.priceMax) {
      filters.push(`ListPrice le ${searchParams.priceMax}`);
    }

    // Bedrooms
    if (searchParams.beds) {
      filters.push(`BedroomsTotal ge ${searchParams.beds}`);
    }

    // Bathrooms
    if (searchParams.baths) {
      filters.push(`BathroomsTotalInteger ge ${searchParams.baths}`);
    }

    // Square footage
    if (searchParams.sqftMin) {
      filters.push(`LivingAreaSqFt ge ${searchParams.sqftMin}`);
    }
    if (searchParams.sqftMax) {
      filters.push(`LivingAreaSqFt le ${searchParams.sqftMax}`);
    }

    // Location filter
    if (searchParams.coordinates) {
      const { lat, lng } = searchParams.coordinates;
      filters.push(
        `Latitude ge ${lat - 0.1} and Latitude le ${lat + 0.1} and ` +
        `Longitude ge ${lng - 0.1} and Longitude le ${lng + 0.1}`
      );
    }

    return filters.join(' and ');
  };

 const fetchToken = async () => {
    const response = await axios.post('/api/token', {
      client_id: process.env.NEXT_PUBLIC_TRESTLE_CLIENT_ID,
      client_secret: process.env.NEXT_PUBLIC_TRESTLE_CLIENT_SECRET,
    });
    return response.data.access_token;
  };

  const handleSearch = async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = await fetchToken();
      const filterQuery = buildODataQuery();
      
      const response = await axios.get(
        `${API_BASE_URL}/trestle/odata/Property`,
        {
          params: {
            $filter: filterQuery,
            $select: 'ListingKey,UnparsedAddress,ListPrice,BedroomsTotal,BathroomsTotalInteger,Latitude,Longitude,Media',
            $top: 10
          },
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json'
          }
        }
      );
  
      const properties = response.data.value || [];
      
      // Process listings with media using Promise.all
      const listingsWithMedia = await Promise.all(
        properties.map(async (property) => {
          const mediaUrls = await fetchMediaUrls(property.ListingKey, token);
            return {
              ...property,
              media: mediaUrls.length > 0 ? mediaUrls[0] : '/properties.jpg',
              allMedia: mediaUrls
            };
        })
      );
  
      // Pass results to parent component
      onSearchResults(listingsWithMedia);
    } catch (error) {
      console.error('Search error:', error);
      setError('Failed to fetch properties. Please try again.');
    } finally {
      setLoading(false);
    }
  };

// Update the fetchMediaUrls function to use the correct endpoint format
const fetchMediaUrls = async (listingKey, token) => {
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

    // Extract and format valid URLs
    return response.data.value
      .map(media => {
        // Clean up URL format if needed
        let url = media.MediaURL?.replace(/^https:\/\//, '') || '';
        return url ? `https://${url}` : null;
      })
      .filter(url => url !== null);

  } catch (error) {
    console.error('Media fetch error:', error);
    return [];
  }
};

  const handleLocationSelect = (latLng) => {
    setSearchParams(prev => ({
      ...prev,
      coordinates: { lat: latLng.lat, lng: latLng.lng },
      zipCode: ''
    }));
    setShowMap(false);
  };

  return (
    <div className="bg-gray-100 py-8 px-4 md:px-6">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Location Selector */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="block font-medium">Search Area</label>
            <div className="flex gap-4">
              <button
                onClick={() => setSearchParams(prev => ({
                  ...prev,
                  locationType: 'zipcode',
                  coordinates: null
                }))}
                className={`px-4 py-2 rounded ${searchParams.locationType === 'zipcode' ? 'bg-blue-500 text-white' : 'bg-white'}`}
              >
                ZIP Code
              </button>
              <button
                onClick={() => setShowMap(true)}
                className={`px-4 py-2 rounded ${searchParams.locationType === 'map' ? 'bg-blue-500 text-white' : 'bg-white'}`}
              >
                Map Area
              </button>
            </div>
            
            {searchParams.locationType === 'zipcode' && (
              <input
                type="text"
                placeholder="Enter ZIP Code"
                value={searchParams.zipCode}
                onChange={(e) => setSearchParams(prev => ({
                  ...prev,
                  zipCode: e.target.value
                }))}
                className="w-full p-2 border rounded"
              />
            )}
          </div>

          {/* Property Type */}
          <div className="space-y-2">
            <label className="block font-medium">Property Type</label>
            <select
              value={searchParams.propertyType}
              onChange={(e) => setSearchParams(prev => ({
                ...prev,
                propertyType: e.target.value
              }))}
              className="w-full p-2 border rounded"
            >
              <option value="">All Types</option>
              {propertyTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Price and Size Filters */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="block font-medium">Price Range</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min Price"
                value={searchParams.priceMin}
                onChange={(e) => setSearchParams(prev => ({
                  ...prev,
                  priceMin: e.target.value
                }))}
                className="w-full p-2 border rounded"
              />
              <input
                type="number"
                placeholder="Max Price"
                value={searchParams.priceMax}
                onChange={(e) => setSearchParams(prev => ({
                  ...prev,
                  priceMax: e.target.value
                }))}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block font-medium">Bedrooms</label>
            <input
              type="number"
              placeholder="Min Beds"
              value={searchParams.beds}
              onChange={(e) => setSearchParams(prev => ({
                ...prev,
                beds: e.target.value
              }))}
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="space-y-2">
            <label className="block font-medium">Bathrooms</label>
            <input
              type="number"
              placeholder="Min Baths"
              value={searchParams.baths}
              onChange={(e) => setSearchParams(prev => ({
                ...prev,
                baths: e.target.value
              }))}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>

        {/* Search Button and Status */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? 'Searching...' : 'Search Properties'}
          </button>
          {error && <p className="text-red-500">{error}</p>}
        </div>
        {showMap && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-3xl">
              <h3 className="text-xl font-bold mb-4">Select Search Area</h3>
              <div className="h-96 relative">
                <MapContainer 
                  center={searchParams.coordinates || [42.1292, -80.0851]} 
                  zoom={13} 
                  className="h-full w-full"
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="© OpenStreetMap contributors"
                  />
                  <LocationSelector 
                    onLocationSelect={handleLocationSelect}
                    initialPosition={searchParams.coordinates}
                  />
                </MapContainer>
              </div>
              <div className="mt-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <label>Radius (miles):</label>
                  <input
                    type="number"
                    value={searchParams.radius}
                    onChange={(e) => setSearchParams(prev => ({
                      ...prev,
                      radius: Math.max(1, parseInt(e.target.value))
                    }))}
                    className="w-20 p-1 border rounded"
                  />
                </div>
                <button
                  onClick={() => setShowMap(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const LocationSelector = ({ onLocationSelect, initialPosition }) => {
  const [marker, setMarker] = useState(initialPosition);

  // Use the useMapEvents hook directly
  const map = useMapEvents({
    click(e) {
      setMarker(e.latlng);
      onLocationSelect(e.latlng);
    },
  });

  return (
    <>
      {marker && (
        <Marker position={marker}>
          <Popup>
            Selected Location: <br />
            {marker.lat.toFixed(4)}, {marker.lng.toFixed(4)}
          </Popup>
        </Marker>
      )}
    </>
  );
};

export default SearchBar;