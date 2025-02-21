// components/PropertyMap.js
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => <p>Loading map...</p>
});

export default function PropertyMap({ coordinates }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h3 className="text-xl font-bold mb-4">Location</h3>
      <div className="h-64 rounded-lg overflow-hidden">
        <Map center={[coordinates.lat, coordinates.lng]} zoom={14}>
          {({ TileLayer, Marker }) => (
            <>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <Marker position={[coordinates.lat, coordinates.lng]} />
            </>
          )}
        </Map>
      </div>
    </div>
  );
}