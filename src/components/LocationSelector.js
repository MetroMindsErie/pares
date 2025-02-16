const LocationSelector = ({ onLocationSelect, initialPosition }) => {
    const [marker, setMarker] = useState(initialPosition);
    // Use useMapEvents from dynamic import (client-only)
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
  