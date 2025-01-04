import React, { useState } from 'react';
import dynamic from 'next/dynamic'; // Import dynamic for conditional rendering

// Dynamically import the MapContainer and related components with SSR disabled
const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), { ssr: false });
const useMapEvents = dynamic(() => import('react-leaflet').then((mod) => mod.useMapEvents), { ssr: false });

const SearchBar = () => {
  const [searchData, setSearchData] = useState({
    type: '',
    budget: '',
    location: null,
    zipCode: '',
  });

  const [locationMethod, setLocationMethod] = useState('map'); // 'map' or 'zipcode'
  const [showMap, setShowMap] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSearchData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = () => {
    console.log('Searching with:', searchData);
  };

  const handleLocationSelect = (latLng) => {
    setSearchData((prev) => ({ ...prev, location: latLng, zipCode: '' }));
    setShowMap(false);
  };

  return (
    <div className="bg-gray-100 py-8 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Flexbox Layout */}
        <div className="flex flex-wrap gap-4 mb-6">
          {/* Location Selection */}
          <div className="flex-1">
            <label className="block text-gray-700 font-medium mb-2">Location Method</label>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="locationMethod"
                  value="map"
                  checked={locationMethod === 'map'}
                  onChange={() => setLocationMethod('map')}
                  className="mr-2"
                />
                Use Map
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="locationMethod"
                  value="zipcode"
                  checked={locationMethod === 'zipcode'}
                  onChange={() => setLocationMethod('zipcode')}
                  className="mr-2"
                />
                Use ZIP Code
              </label>
            </div>
          </div>

          {/* Location Input */}
          <div className="flex-1">
            {locationMethod === 'map' ? (
              <>
                <label className="block text-gray-700 font-medium mb-2">Location</label>
                <button
                  onClick={() => setShowMap(true)}
                  className="w-full px-4 py-2 border rounded-md bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {searchData.location
                    ? `Lat: ${searchData.location.lat}, Lng: ${searchData.location.lng}`
                    : 'Select Location on Map'}
                </button>
              </>
            ) : (
              <>
                <label className="block text-gray-700 font-medium mb-2">ZIP Code</label>
                <input
                  type="text"
                  name="zipCode"
                  value={searchData.zipCode}
                  onChange={(e) =>
                    setSearchData((prev) => ({ ...prev, zipCode: e.target.value, location: null }))
                  }
                  placeholder="Enter ZIP Code"
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </>
            )}
          </div>

          {/* Type Dropdown */}
          <div className="flex-1">
            <label className="block text-gray-700 font-medium mb-2">Property Type</label>
            <select
              name="type"
              value={searchData.type}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Select Type</option>
              <option value="house">House</option>
              <option value="apartment">Apartment</option>
              <option value="condo">Condo</option>
              <option value="townhouse">Townhouse</option>
            </select>
          </div>

          {/* Budget Dropdown */}
          <div className="flex-1">
            <label className="block text-gray-700 font-medium mb-2">Budget</label>
            <select
              name="budget"
              value={searchData.budget}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Select Budget</option>
              <option value="low">Low (Up to $200,000)</option>
              <option value="medium">Medium ($200,000 - $500,000)</option>
              <option value="high">High (Above $500,000)</option>
            </select>
          </div>
        </div>

        {/* Search Button */}
        <div className="text-center">
          <button
            onClick={handleSearch}
            className="px-6 py-3 bg-blue-500 text-white rounded-md shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            Search
          </button>
        </div>
      </div>

      {/* Map Modal */}
      {showMap && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-3xl">
            <h3 className="text-xl font-bold mb-4">Select Location on Map</h3>
            <div className="h-64">
              <LocationSelector onLocationSelect={handleLocationSelect} />
            </div>
            <div className="text-right mt-4">
              <button
                onClick={() => setShowMap(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 mr-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const LocationSelector = ({ onLocationSelect }) => {
  const [marker, setMarker] = useState(null);

  const MapEvents = () => {
    useMapEvents({
      click(e) {
        setMarker(e.latlng);
      },
    });
    return null;
  };

  return (
    <MapContainer center={[42.1292, -80.0851]} zoom={13} className="h-full w-full">
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap contributors"
      />
      <MapEvents />
      {marker && (
        <Marker position={marker}>
          <Popup>
            <button
              onClick={() => onLocationSelect(marker)}
              className="text-blue-500 hover:underline"
            >
              Select this location
            </button>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
};

export default SearchBar;
