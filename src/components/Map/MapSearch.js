// ...existing code...

// When showing property details:
{selectedProperty && (
  <PropertyDetail 
    property={selectedProperty}
    onClose={() => setSelectedProperty(null)} 
  />
)}

// ...existing code...