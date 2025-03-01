import PropTypes from 'prop-types';
import { ActiveProperty } from './ActiveProperty';
import React, { useState } from 'react';

export const SoldProperty = ({ property }) => {
  const [showRawDetails, setShowRawDetails] = useState(false);

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow-lg mb-8">
      <div className="bg-red-600 text-white px-4 py-2 rounded-t-xl">
        Sold for ${property.soldPrice.toLocaleString()} on {property.soldDate}
      </div>

      <div className="mt-4">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl text-gray-500 line-through">
            ${property.price.toLocaleString()}
          </span>
          <span className="text-3xl font-bold text-gray-900">
            ${property.soldPrice.toLocaleString()}
          </span>
        </div>
        <p className="text-sm text-gray-600">
          Closed on {property.soldDate}
        </p>
      </div>

      <ActiveProperty property={property} />
      
      <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
        <h3 className="font-medium">Sale Details</h3>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div>
            <p className="text-sm">Closing Date</p>
            <p className="font-medium">{property.soldDate}</p>
          </div>
          {property.buyerAgent && (
            <div>
              <p className="text-sm">Buyer's Agent</p>
              <p className="font-medium">{property.buyerAgent}</p>
            </div>
          )}
        </div>
      </div>

      {/* Raw Property Information */}
      <div className="mt-12 p-6 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-bold mb-4">Additional Property Information</h3>
        <button
          className="text-blue-600 text-sm mb-4"
          onClick={() => setShowRawDetails(!showRawDetails)}
        >
          {showRawDetails ? 'Hide Details' : 'Show Details'}
        </button>
        {showRawDetails && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm">Water Source</p>
              <p className="font-medium">{property.waterSource}</p>
            </div>
            <div>
              <p className="text-sm">Sewer</p>
              <p className="font-medium">{property.sewer}</p>
            </div>
            <div>
              <p className="text-sm">Property Type</p>
              <p className="font-medium">{property.propertyType}</p>
            </div>
            <div>
              <p className="text-sm">Zoning Description</p>
              <p className="font-medium">{property.zoningDescription}</p>
            </div>
            <div>
              <p className="text-sm">Days on Market</p>
              <p className="font-medium">{property.daysOnMarket}</p>
            </div>
            <div>
              <p className="text-sm">Flooring</p>
              <p className="font-medium">{property.flooring}</p>
            </div>
            <div>
              <p className="text-sm">Cooling</p>
              <p className="font-medium">{property.cooling}</p>
            </div>
            <div>
              <p className="text-sm">Heating</p>
              <p className="font-medium">{property.heating}</p>
            </div>
            <div>
              <p className="text-sm">Interior Features</p>
              <p className="font-medium">{property.interiorFeatures}</p>
            </div>
            <div>
              <p className="text-sm">Exterior Features</p>
              <p className="font-medium">{property.exteriorFeatures}</p>
            </div>
            <div>
              <p className="text-sm">Appliances</p>
              <p className="font-medium">{property.appliances}</p>
            </div>
            <div>
              <p className="text-sm">Lot Size Dimensions</p>
              <p className="font-medium">{property.lotsizedimension}</p>
            </div>
            <div>
              <p className="text-sm">Fireplace Features</p>
              <p className="font-medium">{property.fireplacefeatures}</p>
            </div>
            <div>
              <p className="text-sm">Pool</p>
              <p className="font-medium">{property.pool}</p>
            </div>
            <div>
              <p className="text-sm">View</p>
              <p className="font-medium">{property.view}</p>
            </div>
            <div>
              <p className="text-sm">Construction</p>
              <p className="font-medium">{property.construction}</p>
            </div>
            <div>
              <p className="text-sm">Roof</p>
              <p className="font-medium">{property.roof}</p>
            </div>
            <div>
              <p className="text-sm">Style</p>
              <p className="font-medium">{property.style}</p>
            </div>
            <div>
              <p className="text-sm">High School</p>
              <p className="font-medium">{property.highschool}</p>
            </div>
            <div>
              <p className="text-sm">Middle School</p>
              <p className="font-medium">{property.middleschool}</p>
            </div>
            <div>
              <p className="text-sm">Parking Features</p>
              <p className="font-medium">{property.parkingFeatures}</p>
            </div>
            <div>
              <p className="text-sm">Foundation Details</p>
              <p className="font-medium">{property.foundationDetails}</p>
            </div>
            <div>
              <p className="text-sm">Basement</p>
              <p className="font-medium">{property.basement}</p>
            </div>
            <div>
              <p className="text-sm">Utilities</p>
              <p className="font-medium">{property.utilities}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

SoldProperty.propTypes = {
  property: PropTypes.shape({
    ...ActiveProperty.propTypes.property,
    soldPrice: PropTypes.number.isRequired,
    soldDate: PropTypes.string.isRequired,
    buyerAgent: PropTypes.string,
  }).isRequired,
};