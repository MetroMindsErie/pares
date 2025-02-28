'use client';
import React from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet marker icons
const DefaultIcon = L.icon({
  iconUrl: '/marker-icon.png',
  iconRetinaUrl: '/marker-icon-2x.png',
  shadowUrl: '/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const PropertyMap = ({ listings,onLocationSelect }) => {
  const mapRef = React.useRef();

  const handleMapClick = (e) => {
    const { lat, lng } = e.latlng;
    onLocationSelect({ lat: 41.8, lng: -79.5 });
  };
  const getCenter = () => {
    if (listings.length === 0) return [41.8, -79.5];
    const validListings = listings.filter(l => l.lat && l.lng);
    const avgLat = validListings.reduce((sum, l) => sum + l.lat, 0) / validListings.length;
    const avgLong = validListings.reduce((sum, l) => sum + l.lng, 0) / validListings.length;
    return [avgLat, avgLong];
  };
  return (
    <div className="h-[600px] w-full rounded-lg overflow-hidden shadow-lg border border-gray-200">
      <MapContainer 
        center={getCenter()} 
        zoom={13} 
        className="h-full w-full"
        scrollWheelZoom={true}
        whenCreated={map => mapRef.current = map}
        onClick={handleMapClick}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {/* Existing markers and popups */}
      </MapContainer>
      <button 
        onClick={() => handleSearchFromMap(mapRef.current.getCenter())}
        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg"
      >
        Search This Area
      </button>
    </div>
  );
};

export default PropertyMap;