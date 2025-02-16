import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { getAccessToken, getPropertiesByFilter, getMediaUrls } from '../services/trestleServices';
import { useRouter } from 'next/router';

const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
const useMapEvents = dynamic(
  () => import('react-leaflet').then((mod) => mod.useMapEvents),
  { ssr: false }
);

const DEFAULT_RADIUS = 10;

const SearchBar = ({ onSearchResults }) => {
  const router = useRouter();
  const [searchParams, setSearchParams] = useState({
    propertyType: router.query.propertyType || 'Residential',
    priceMin: router.query.priceMin || '',
    priceMax: router.query.priceMax || '',
    beds: router.query.beds || '',
    baths: router.query.baths || '',
    sqftMin: router.query.sqftMin || '',
    sqftMax: router.query.sqftMax || '',
    locationType: router.query.locationType || 'zipcode',
    zipCode: router.query.zipCode || '',
    coordinates: null,
    radius: router.query.radius ? parseInt(router.query.radius) : DEFAULT_RADIUS,
    listingStatus: router.query.listingStatus || 'Active'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    const isReload = performance.getEntriesByType('navigation')[0].type === 'reload';
    if (isReload) {
      localStorage.removeItem('searchParams');
      localStorage.removeItem('searchResults');
    } else {
      const savedSearchParams = JSON.parse(localStorage.getItem('searchParams'));
      const savedSearchResults = JSON.parse(localStorage.getItem('searchResults')) || [];
      if (savedSearchParams) {
        setSearchParams(savedSearchParams);
      }
      if (savedSearchResults) {
        onSearchResults(savedSearchResults);
      }
    }
  }, []);

  const propertyTypes = [
    { value: 'Residential', label: 'Single Family Home' }
    // Add additional types as needed
  ];

  const listingStatuses = [
    { value: 'Active', label: 'Active' },
    { value: 'ActiveUnderContract', label: 'Active Under Contract' },
    { value: 'Closed', label: 'Closed' },
    { value: 'ComingSoon', label: 'Coming Soon' }
  ];

  const buildODataQuery = () => {
    const filters = [];
    if (searchParams.propertyType) {
      filters.push(`PropertyType eq '${searchParams.propertyType}'`);
    }
    if (searchParams.priceMin) {
      filters.push(`ListPrice ge ${searchParams.priceMin}`);
    }
    if (searchParams.priceMax) {
      filters.push(`ListPrice le ${searchParams.priceMax}`);
    }
    if (searchParams.beds) {
      filters.push(`BedroomsTotal ge ${searchParams.beds}`);
    }
    if (searchParams.baths) {
      filters.push(`BathroomsTotalInteger ge ${searchParams.baths}`);
    }
    if (searchParams.sqftMin) {
      filters.push(`LivingAreaSqFt ge ${searchParams.sqftMin}`);
    }
    if (searchParams.sqftMax) {
      filters.push(`LivingAreaSqFt le ${searchParams.sqftMax}`);
    }
    if (searchParams.coordinates) {
      const { lat, lng } = searchParams.coordinates;
      filters.push(
        `Latitude ge ${lat - 0.1} and Latitude le ${lat + 0.1} and ` +
        `Longitude ge ${lng - 0.1} and Longitude le ${lng + 0.1}`
      );
    }
    if (searchParams.listingStatus) {
      filters.push(`MlsStatus has '${searchParams.listingStatus}'`);
    }
    return filters.join(' and ');
  };

  const handleSearch = async () => {
    setLoading(true);
    setError('');
    try {
      const token = await getAccessToken();
      const filterQuery = buildODataQuery();
      const properties = await getPropertiesByFilter(filterQuery, token);
      const listingsWithMedia = await Promise.all(
        properties.map(async (property) => {
          const mediaUrls = await getMediaUrls(property.ListingKey, token);
          return {
            ...property,
            media:
              mediaUrls.length > 0
                ? mediaUrls[0]
                : '/fallback-property.jpg',
            allMedia: mediaUrls
          };
        })
      );
      onSearchResults(listingsWithMedia);
      localStorage.setItem('searchParams', JSON.stringify(searchParams));
      localStorage.setItem('searchResults', JSON.stringify(listingsWithMedia));
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to fetch properties. Please try again.');
    } finally {
      setLoading(false);
    }
    router.push({
      pathname: '/',
      query: {
        propertyType: searchParams.propertyType,
        priceMin: searchParams.priceMin,
        priceMax: searchParams.priceMax,
        beds: searchParams.beds,
        baths: searchParams.baths,
        sqftMin: searchParams.sqftMin,
        sqftMax: searchParams.sqftMax,
        locationType: searchParams.locationType,
        zipCode: searchParams.zipCode,
        radius: searchParams.radius,
        listingStatus: searchParams.listingStatus
      }
    }, undefined, { shallow: true });
  };

  const handleLocationSelect = (latLng) => {
    setSearchParams((prev) => ({
      ...prev,
      coordinates: { lat: latLng.lat, lng: latLng.lng },
      zipCode: ''
    }));
    setShowMap(false);
  };

  return (
    <div className="bg-gray-100 py-8 px-4 md:px-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="space-y-2">
          <label className="block font-medium">Search Area</label>
          <div className="flex gap-4">
            <button
              onClick={() =>
                setSearchParams((prev) => ({
                  ...prev,
                  locationType: 'zipcode',
                  coordinates: null
                }))
              }
              className={`px-4 py-2 rounded-full shadow-md ${searchParams.locationType === 'zipcode'
                ? 'bg-blue-500 text-white'
                : 'bg-white border'
                }`}
            >
              ZIP Code
            </button>
            <button disabled
              onClick={() => setShowMap(true)}
              className={`px-4 py-2 rounded-full shadow-md ${searchParams.locationType === 'map'
                ? 'bg-blue-500 text-white'
                : 'bg-white border'
                }`}
            >
              Map Area
            </button>
          </div>
          {searchParams.locationType === 'zipcode' && (
            <input
              type="text"
              placeholder="Enter ZIP Code"
              value={searchParams.zipCode}
              onChange={(e) =>
                setSearchParams((prev) => ({
                  ...prev,
                  zipCode: e.target.value
                }))
              }
              className="w-full p-2 border rounded-full mt-2 shadow-md"
            />
          )}
        </div>
        <div className="space-y-2">
          <label className="block font-medium">Property Type</label>
          <select
            value={searchParams.propertyType}
            onChange={(e) =>
              setSearchParams((prev) => ({
                ...prev,
                propertyType: e.target.value
              }))
            }
            className="w-full p-2 border rounded-full shadow-md"
          >
            <option value="">All Types</option>
            {propertyTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Other Filters */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="block font-medium">Price Range</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min Price"
                value={searchParams.priceMin}
                onChange={(e) =>
                  setSearchParams((prev) => ({
                    ...prev,
                    priceMin: e.target.value
                  }))
                }
                className="w-full p-2 border rounded-full shadow-md"
              />
              <input
                type="number"
                placeholder="Max Price"
                value={searchParams.priceMax}
                onChange={(e) =>
                  setSearchParams((prev) => ({
                    ...prev,
                    priceMax: e.target.value
                  }))
                }
                className="w-full p-2 border rounded-full shadow-md"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block font-medium">Bedrooms</label>
            <input
              type="number"
              placeholder="Min Beds"
              value={searchParams.beds}
              onChange={(e) =>
                setSearchParams((prev) => ({ ...prev, beds: e.target.value }))
              }
              className="w-full p-2 border rounded-full shadow-md"
            />
          </div>
          <div className="space-y-2">
            <label className="block font-medium">Bathrooms</label>
            <input
              type="number"
              placeholder="Min Baths"
              value={searchParams.baths}
              onChange={(e) =>
                setSearchParams((prev) => ({ ...prev, baths: e.target.value }))
              }
              className="w-full p-2 border rounded-full shadow-md"
            />
          </div>
          <div className="space-y-2">
            <label className="block font-medium">Listing Status</label>
            <select
              value={searchParams.listingStatus}
              onChange={(e) =>
                setSearchParams((prev) => ({
                  ...prev,
                  listingStatus: e.target.value
                }))
              }
              className="w-full p-2 border rounded-full shadow-md"
            >
              {listingStatuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Button */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-3 bg-blue-500 text-white rounded-full shadow-md hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? 'Searching...' : 'Search Properties'}
          </button>
          {error && <p className="text-red-500">{error}</p>}
        </div>

        {/* Map Modal */}
        {showMap && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-3xl shadow-lg">
              <h3 className="text-xl font-bold mb-4">Select Search Area</h3>
              <div className="h-96 relative">
                <MapContainer
                  center={searchParams.coordinates || [42.1292, -80.0851]}
                  zoom={13}
                  className="h-full w-full rounded-lg"
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
                    onChange={(e) =>
                      setSearchParams((prev) => ({
                        ...prev,
                        radius: Math.max(1, parseInt(e.target.value))
                      }))
                    }
                    className="w-20 p-1 border rounded-full shadow-md"
                  />
                </div>
                <button
                  onClick={() => setShowMap(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-full shadow-md"
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
  useMapEvents({
    click(e) {
      setMarker(e.latlng);
      onLocationSelect(e.latlng);
    }
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
