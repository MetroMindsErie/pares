'use client';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Link from 'next/link';

// Fix default marker icons
const DefaultIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const SoldIcon = L.icon({
  ...DefaultIcon.options,
  iconUrl: '/sold-marker.png', // Create a red version of the marker icon
});

export default function PropertyMap({ listings }) {
  const getCenter = () => {
    if (listings.length === 0) return [40.7128, -74.0060]; // Default to NYC
    const validListings = listings.filter(l => l.coordinates);
    const avgLat = validListings.reduce((sum, l) => sum + l.coordinates.lat, 0) / validListings.length;
    const avgLng = validListings.reduce((sum, l) => sum + l.coordinates.lng, 0) / validListings.length;
    return [avgLat, avgLng];
  };

  return (
    <div className="h-[600px] w-full rounded-lg overflow-hidden shadow-lg border border-gray-200">
      <MapContainer 
        center={getCenter()} 
        zoom={13} 
        className="h-full w-full"
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {listings.map((listing) => (
          listing.lat && listing.lng && (
            <Marker
              key={listing.ListingKey}
              position={[listing.coordinates.lat, listing.coordinates.lng]}
              icon={listing.StandardStatus === 'Closed' ? SoldIcon : DefaultIcon}
            >
              <Popup>
                <div className="min-w-[250px]">
                  <h3 className="font-semibold text-lg">{listing.UnparsedAddress}</h3>
                  <p className="text-gray-600">
                    {listing.BedroomsTotal} beds · {listing.BathroomsTotalInteger} baths
                  </p>
                  <p className="text-xl font-bold text-teal-600">
                    {listing.ListPrice ? `$${listing.ListPrice.toLocaleString()}` : 'Price not available'}
                  </p>
                  {listing.media && (
                    <img 
                      src={listing.media} 
                      alt={listing.UnparsedAddress} 
                      className="w-full h-32 object-cover mt-2 rounded"
                    />
                  )}
                  <Link 
                    href={`/property/${listing.ListingKey}`}
                    className="mt-2 inline-block text-teal-600 hover:underline"
                  >
                    View Details →
                  </Link>
                </div>
              </Popup>
            </Marker>
          )
        ))}
      </MapContainer>
    </div>
  );
}