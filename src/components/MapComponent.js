import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Create a Map component that accepts children as a function
const MapComponent = ({ center, zoom, children, ...props }) => (
  <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }} {...props}>
    {children({ TileLayer, Marker })}
  </MapContainer>
);

export default MapComponent;
