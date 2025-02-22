// components/PropertyDetails.js
export function PropertyDetails({ property }) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Property Details</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <DetailSection title="Overview">
            <DetailItem label="MLS#" value={property.ListingKey} />
            <DetailItem label="Type" value={property.PropertyType} />
            <DetailItem label="Bed/Bath" value={`${property.BedroomsTotal} / ${property.BathroomsTotalInteger}`} />
            <DetailItem label="Year Built" value={property.YearBuilt} />
          </DetailSection>
  
          <DetailSection title="Features">
            <DetailItem label="Living Area" value={`${property.LivingAreaSqFt} sqft`} />
            <DetailItem label="Lot Size" value={`${property.LotSizeAcres} acres`} />
            <DetailItem label="Garage" value={`${property.GarageSpaces} car`} />
            <DetailItem label="Stories" value={property.StoriesTotal} />
          </DetailSection>
  
          <DetailSection title="Financial">
            <DetailItem label="List Price" value={`$${property.ListPrice?.toLocaleString()}`} />
            <DetailItem label="Price/sqft" value={`$${(property.ListPrice / property.LivingAreaSqFt).toFixed(2)}`} />
            <DetailItem label="Taxes" value={`$${property.TaxAnnualAmount?.toLocaleString()}/year`} />
            <DetailItem label="Days on Market" value={property.DaysOnMarket} />
          </DetailSection>
        </div>
      </div>
    );
  }
  
  function DetailSection({ title, children }) {
    return (
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="space-y-3">{children}</div>
      </div>
    );
  }
  
  function DetailItem({ label, value }) {
    return (
      <div className="flex justify-between">
        <span className="text-gray-600">{label}</span>
        <span className="text-gray-900 font-medium">{value}</span>
      </div>
    );
  }