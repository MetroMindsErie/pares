import PropTypes from 'prop-types';
import { DetailItem } from './DetailItem';
import { ActionButton } from './ActionButton';
import React, { useState } from 'react';
import { PropertyGallery } from './PropertyGallery';

export const ActiveProperty = ({ property }) => {
  const [showAllDetails, setShowAllDetails] = useState(false);

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
      <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="prose max-w-none">
            <h2 className="text-2xl font-bold">Property Details</h2>
            <p>{property.description}</p>
          </div>

          {/* Features Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium">Features</h3>
              <ul className="mt-2 space-y-1">
                {property.features.slice(0, showAllDetails ? undefined : 3).map((feature, i) => (
                  <li key={i}>• {feature}</li>
                ))}
              </ul>
              {property.features.length > 3 && (
                <button
                  className="text-blue-600 mt-2 text-sm"
                  onClick={() => setShowAllDetails(!showAllDetails)}
                >
                  {showAllDetails ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
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
  }).isRequired,
};