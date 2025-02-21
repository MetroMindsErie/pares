import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { getAccessToken, getPropertiesByFilter, getMediaUrls } from '../services/trestleServices';
import { useRouter } from 'next/router';
import { MagnifyingGlassIcon, MapPinIcon } from '@heroicons/react/24/outline';

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
    e.preventDefault();
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
    <form onSubmit={handleSearch} className="w-full max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row gap-2 p-2 bg-white rounded-lg shadow-xl">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Enter city, neighborhood, or ZIP"
            className="w-full pl-10 pr-4 py-3 rounded-lg border-0 focus:ring-2 focus:ring-blue-500"
          />
          <MapPinIcon className="w-5 h-5 absolute left-3 top-3.5 text-gray-400" />
        </div>

        <div className="flex gap-2">
          <select
            value={searchParams.propertyType}
            onChange={(e) => setSearchParams(p => ({...p, propertyType: e.target.value}))}
            className="px-4 py-2 rounded-lg border border-gray-200"
          >
            <option value="Residential">Homes</option>
            <option value="Condo">Condos</option>
            <option value="MultiFamily">Multi-Family</option>
          </select>

          <input
            type="number"
            placeholder="Min price"
            value={searchParams.priceMin}
            onChange={(e) => setSearchParams(p => ({...p, priceMin: e.target.value}))}
            className="w-24 px-4 py-2 rounded-lg border border-gray-200"
          />

          <input
            type="number"
            placeholder="Max price"
            value={searchParams.priceMax}
            onChange={(e) => setSearchParams(p => ({...p, priceMax: e.target.value}))}
            className="w-24 px-4 py-2 rounded-lg border border-gray-200"
          />

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
          >
            <MagnifyingGlassIcon className="w-5 h-5" />
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>
    </form>
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
