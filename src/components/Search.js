import React, { useState, useEffect } from 'react';
import { getPropertiesByFilter } from '../services/trestleServices';
import { useRouter } from 'next/router';
import { MagnifyingGlassIcon, MapPinIcon } from '@heroicons/react/24/outline';
import axios from 'axios';

const DEFAULT_RADIUS = 10; // Define DEFAULT_RADIUS if not defined elsewhere
export const fetchToken = async () => {
  const response = await axios.post('/api/token', {
    client_id: process.env.NEXT_PUBLIC_TRESTLE_CLIENT_ID,
    client_secret: process.env.NEXT_PUBLIC_TRESTLE_CLIENT_SECRET,
  });
  return response.data.access_token;
};

const fetchMediaUrls = async (listingKey, token) => {
  try {
    const response = await axios.get(
      `https://api-trestle.corelogic.com/trestle/odata/Media`, {
      params: {
        $filter: `ResourceRecordKey eq '${listingKey}'`,
        $orderby: 'Order',
        $select: 'MediaURL'
      },
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      }
    }
    );
    return response.data.value.map((media) => media.MediaURL);
  } catch (error) {
    console.error('Error fetching media:', error);
    return [];
  }
};

export const SearchBar = ({ onSearchResults }) => {
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
  const [suggestions, setSuggestions] = useState([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const navEntries = typeof performance !== 'undefined' ?
      performance.getEntriesByType('navigation') : [];
    const isReload = navEntries.length > 0 && navEntries[0].type === 'reload';

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



  const fetchSuggestions = async (input) => {
    if (!input) {
      setSuggestions([]);
      return;
    }
    try {
      console.log('Fetching suggestions for input:', input);
      const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
        params: {
          q: input,
          format: 'json',
          addressdetails: 1,
          limit: 5,
          viewbox: '-80.1,42.2,-79.9,42.1', // Replace with your bounding box coordinates
          bounded: 1
        }
      });
      console.log('API response:', response.data);
      const filteredSuggestions = response.data.filter(suggestion => {
        const zip = suggestion.address.postcode;
        return zip >= '16501' && zip <= '16513';
      });
      console.log('Filtered suggestions:', filteredSuggestions);
      setSuggestions(filteredSuggestions);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    fetchSuggestions(value);
  };

  const handleSuggestionSelect = (suggestion) => {
    setQuery(suggestion.display_name);
    setSuggestions([]);
    const latLng = {
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon)
    };
    handleLocationSelect(latLng);
  };

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
    if (searchParams.listingStatus) {
      filters.push(`MlsStatus has '${searchParams.listingStatus}'`);
    }
    return filters.join(' and ');
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = await fetchToken();
      const filterQuery = buildODataQuery();
      const properties = await getPropertiesByFilter(filterQuery, token);
      console.log('Fetched properties:', properties);
      const listingsWithMedia = await Promise.all(
        properties.map(async (property) => {
          const mediaUrls = await fetchMediaUrls(property.ListingKey, token);
          console.log('Fetched media URLs for property:', property.ListingKey, mediaUrls);
          return {
            ...property,
            media:
              mediaUrls.length > 0
                ? mediaUrls[0]
                : '/properties.jpg',
            allMedia: mediaUrls
          };
        })
      );
      console.log('Listings with media:', listingsWithMedia);
      onSearchResults(listingsWithMedia);
      localStorage.setItem('searchParams', JSON.stringify(searchParams));
      localStorage.setItem('searchResults', JSON.stringify(listingsWithMedia));
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to fetch properties. Please try again.');
    } finally {
      setLoading(false);
    }
    // Remove or comment out router.push to avoid reloading and resetting state:
    // router.push({ pathname: '/', query: { ... } }, undefined, { shallow: true });
  };

  const handleLocationSelect = (latLng) => {
    setSearchParams((prev) => ({
      ...prev,
      coordinates: { lat: latLng.lat, lng: latLng.lng },
      zipCode: ''
    }));
  };

  return (
    <form onSubmit={handleSearch} className="w-full max-w-6xl mx-auto px-4">
      <div className="flex flex-col md:flex-row gap-2 p-2 bg-white rounded-lg shadow-lg border border-gray-200">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MapPinIcon className="w-5 h-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="City, Neighborhood, ZIP, or Address"
            value={query}
            onChange={handleInputChange}
            className="w-full pl-10 pr-4 py-3 rounded-lg border-0 text-gray-900 
              placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
          />
          {suggestions.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full bg-white rounded-lg shadow-lg 
              border border-gray-200 divide-y divide-gray-100">
              {suggestions.map((suggestion, index) => (
                <li
                  key={index}
                  onClick={() => handleSuggestionSelect(suggestion)}
                  className="px-4 py-3 cursor-pointer hover:bg-gray-50 text-sm 
                    text-gray-700 transition-colors"
                >
                  {suggestion.display_name}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={searchParams.propertyType}
            onChange={(e) => setSearchParams(p => ({ ...p, propertyType: e.target.value }))}
            className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm 
              text-gray-700 focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="Residential">All Homes</option>
            <option value="Condo">Condos</option>
            <option value="MultiFamily">Multi-Family</option>
          </select>

          <div className="relative">
            <input
              type="number"
              placeholder="Min Price"
              value={searchParams.priceMin}
              onChange={(e) => setSearchParams(p => ({ ...p, priceMin: e.target.value }))}
              className="w-28 px-4 py-2.5 rounded-lg border border-gray-200 text-sm 
                text-gray-700 focus:border-blue-500 focus:ring-blue-500"
            />
            <span className="absolute right-3 top-3 text-gray-400 text-sm">$</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
              disabled:bg-gray-400 flex items-center gap-2 transition-colors 
              focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <MagnifyingGlassIcon className="w-5 h-5" />
            <span className="hidden sm:inline">{loading ? 'Searching...' : 'Search'}</span>
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4 overflow-x-auto scrollbar-hide">
        <div className="relative flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSearchParams(p => ({
              ...p,
              beds: p.beds === 6 ? 1 : (p.beds || 0) + 1
            }))}
            className="px-4 py-2 rounded-full text-sm bg-gray-100 text-gray-600 
              hover:bg-blue-100 hover:text-blue-600 transition-colors"
          >
            Beds
          </button>
          <span className="px-2 py-1 rounded-full bg-gray-200 text-gray-700 text-sm shadow 
            hover:bg-blue-100 hover:text-blue-600 transition-colors">
            {searchParams.beds >= 6 ? '6+' : `${searchParams.beds || 0}`}
          </span>
        </div>

        <div className="relative flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSearchParams(p => ({
              ...p,
              baths: p.baths === 6 ? 1 : (p.baths || 0) + 1
            }))}
            className="px-4 py-2 rounded-full text-sm bg-gray-100 text-gray-600 
              hover:bg-blue-100 hover:text-blue-600 transition-colors"
          >
            Baths
          </button>
          <span className="px-2 py-1 rounded-full bg-gray-200 text-gray-700 text-sm shadow 
            hover:bg-blue-100 hover:text-blue-600 transition-colors">
            {searchParams.baths >= 6 ? '6+' : `${searchParams.baths || 0}`}
          </span>
        </div>
      </div>
    </form>
  );
};
