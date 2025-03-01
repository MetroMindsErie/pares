import PropTypes from 'prop-types';
import { DetailItem } from './DetailItem';
import { ActionButton } from './ActionButton';
import React, { useState } from 'react';
import { PropertyGallery } from './PropertyGallery';

export const ActiveProperty = ({ property }) => {
  const [showRawDetails, setShowRawDetails] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow-lg mb-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 relative">
          <PropertyGallery media={property.images} />
          <div className="absolute top-4 right-4 bg-white px-3 py-1 rounded-full text-sm font-bold">
            MLS# {property.mlsNumber} • ACTIVE
          </div>
        </div>

        {/* Key Details */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              ${property.price.toLocaleString()}
            </h1>
            <p className="text-lg text-gray-600 mt-1">{property.address}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <DetailItem icon="bed" label={`${property.bedrooms} beds`} />
            <DetailItem icon="bath" label={`${property.bathrooms} baths`} />
            <DetailItem icon="ruler" label={`${property.sqft.toLocaleString()} sqft`} />
            <DetailItem icon="lot" label={`${property.lotSize} acres`} />
          </div>

          <div className="space-y-2">
            <ActionButton variant="primary">Schedule Tour</ActionButton>
            <ActionButton variant="secondary">Contact Agent</ActionButton>
          </div>
        </div>
      </div>

      {/* Additional Details */}
      <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          <h2 className="text-2xl font-bold">Property Details</h2>
          <p>
            {property.description.length > 200 ? (
              <>
                {property.description.substring(0, 200)}...
                <button
                  className="text-blue-600 text-sm"
                  onClick={() => setShowFullDescription(!showFullDescription)}
                >
                  {showFullDescription ? 'Show Less' : 'Show More'}
                </button>
                {showFullDescription && <span>{property.description.substring(200)}</span>}
              </>
            ) : (
              property.description
            )}
          </p>
        </div>
      </div>
      <div className="space-y-6">
          <div className="p-6 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-bold mb-4">Tax Information</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Annual Taxes</span>
                <span>${property.taxes.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="p-6 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-bold mb-4">Listing Agent</h3>
            <div className="flex items-center">
              <img
                src={property.agent.photo}
                className="w-12 h-12 rounded-full mr-3"
                alt={property.agent.name}
              />
              <div>
                <p className="font-medium">{property.agent.name}</p>
                <p className="text-sm text-gray-600">{property.agent.brokerage}</p>
              </div>
            </div>
            <ActionButton variant="primary" className="mt-4">
              Contact Agent
            </ActionButton>
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

ActiveProperty.propTypes = {
  property: PropTypes.shape({
    mlsNumber: PropTypes.string.isRequired,
    address: PropTypes.string.isRequired,
    price: PropTypes.number.isRequired,
    bedrooms: PropTypes.number.isRequired,
    bathrooms: PropTypes.number.isRequired,
    sqft: PropTypes.number.isRequired,
    lotSize: PropTypes.number.isRequired,
    description: PropTypes.string.isRequired,
    features: PropTypes.arrayOf(PropTypes.string).isRequired,
    taxes: PropTypes.number.isRequired,
    agent: PropTypes.shape({
      name: PropTypes.string.isRequired,
      brokerage: PropTypes.string.isRequired,
      photo: PropTypes.string.isRequired,
    }).isRequired,
    images: PropTypes.arrayOf(PropTypes.string),
    // New fields
    waterSource: PropTypes.string.isRequired,
    sewer: PropTypes.string.isRequired,
    propertyType: PropTypes.string.isRequired,
    zoningDescription: PropTypes.string.isRequired,
    daysOnMarket: PropTypes.number.isRequired,
    flooring: PropTypes.string.isRequired,
    cooling: PropTypes.string.isRequired,
    heating: PropTypes.string.isRequired,
    interiorFeatures: PropTypes.string.isRequired,
    exteriorFeatures: PropTypes.string.isRequired,
    appliances: PropTypes.string.isRequired,
    lotsizedimension: PropTypes.string.isRequired,
    fireplacefeatures: PropTypes.string.isRequired,
    pool: PropTypes.string.isRequired,
    view: PropTypes.string.isRequired,
    construction: PropTypes.string.isRequired,
    roof: PropTypes.string.isRequired,
    style: PropTypes.string.isRequired,
    highschool: PropTypes.string.isRequired,
    middleschool: PropTypes.string.isRequired,
    parkingFeatures: PropTypes.string.isRequired,
    foundationDetails: PropTypes.string.isRequired,
    basement: PropTypes.string.isRequired,
    utilities: PropTypes.string.isRequired,
  }).isRequired,
};
