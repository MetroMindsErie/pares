import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBed, faBath, faRuler, faCar, faHouse, faCalendar } from '@fortawesome/free-solid-svg-icons';
import ImageGallery from './ImageGallery';
import BackToListingsButton from './BackToListingsButton';
import Layout from './Layout';
import BuyerAgent from './Property/BuyerAgent';

export const ActiveProperty = ({ property }) => {
  const [activeTab, setActiveTab] = useState('details');

  // Format price as currency
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-xl mt-6 font-semibold mb-4 text-gray-900">Your Buyer Agent</h2>
          <BuyerAgent />
        </div>
        {/* Back button */}
        <div className="mb-6">
          <BackToListingsButton />
        </div>


        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{property.UnparsedAddress}</h1>
          <p className="text-lg md:text-xl text-gray-700">
            {property.City}, {property.StateOrProvince} {property.PostalCode}
          </p>
        </div>

        {/* Image Gallery */}
        <div className="mb-8">
          <ImageGallery images={property.mediaUrls || []} address={property.UnparsedAddress} />
        </div>

        {/* Property Overview */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-blue-700 mb-2 sm:mb-0">
              {formatPrice(property.ListPrice)}
            </h2>
            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 md:mt-0">
              <div className="flex items-center">
                <FontAwesomeIcon icon={faBed} className="text-gray-500 mr-2" />
                <span className="font-semibold">{property.BedroomsTotal || 'N/A'} Beds</span>
              </div>
              <div className="flex items-center">
                <FontAwesomeIcon icon={faBath} className="text-gray-500 mr-2" />
                <span className="font-semibold">{property.BathroomsTotalInteger || 'N/A'} Baths</span>
              </div>
              <div className="flex items-center">
                <FontAwesomeIcon icon={faRuler} className="text-gray-500 mr-2" />
                <span className="font-semibold">{property.LivingArea ? property.LivingArea.toLocaleString() : 'N/A'} sq ft</span>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="inline-block bg-green-100 text-green-800 rounded-full px-3 py-1 text-sm font-medium mb-6">
            Active Listing
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex overflow-x-auto" aria-label="Tabs">
              <button
                className={`mr-4 sm:mr-8 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'details'
                    ? 'border-blue-700 text-blue-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                onClick={() => setActiveTab('details')}
              >
                Property Details
              </button>
              <button
                className={`mr-4 sm:mr-8 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'features'
                    ? 'border-blue-700 text-blue-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                onClick={() => setActiveTab('features')}
              >
                Features & Amenities
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'details' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <FontAwesomeIcon icon={faHouse} className="text-gray-500 mr-3 mt-1" />
                      <div>
                        <span className="font-medium">Property Type:</span>{' '}
                        <span className="text-gray-700">{property.PropertyType || 'Residential'}</span>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <FontAwesomeIcon icon={faCalendar} className="text-gray-500 mr-3 mt-1" />
                      <div>
                        <span className="font-medium">Year Built:</span>{' '}
                        <span className="text-gray-700">{property.YearBuilt || 'N/A'}</span>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <FontAwesomeIcon icon={faRuler} className="text-gray-500 mr-3 mt-1" />
                      <div>
                        <span className="font-medium">Lot Size:</span>{' '}
                        <span className="text-gray-700">
                          {property.LotSizeArea
                            ? `${property.LotSizeArea.toLocaleString()} ${property.LotSizeUnits || 'sq ft'}`
                            : 'N/A'}
                        </span>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <FontAwesomeIcon icon={faCar} className="text-gray-500 mr-3 mt-1" />
                      <div>
                        <span className="font-medium">Parking:</span>{' '}
                        <span className="text-gray-700">{property.ParkingTotal || 'N/A'} spaces</span>
                      </div>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-3">Interior Details</h3>
                  <ul className="space-y-2">
                    <li>
                      <span className="font-medium">Total Rooms:</span>{' '}
                      <span className="text-gray-700">{property.RoomsTotal || 'N/A'}</span>
                    </li>
                    <li>
                      <span className="font-medium">Basement:</span>{' '}
                      <span className="text-gray-700">{property.HasBasement ? 'Yes' : 'No'}</span>
                    </li>
                    <li>
                      <span className="font-medium">Cooling:</span>{' '}
                      <span className="text-gray-700">{property.Cooling || 'N/A'}</span>
                    </li>
                    <li>
                      <span className="font-medium">Heating:</span>{' '}
                      <span className="text-gray-700">{property.Heating || 'N/A'}</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Description</h3>
                <p className="text-gray-700 whitespace-pre-line">
                  {property.PublicRemarks || 'No description provided.'}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'features' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Property Features</h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-700">
                    {property.Cooling && <li>{property.Cooling}</li>}
                    {property.Heating && <li>{property.Heating}</li>}
                    {property.HasFireplace && <li>Fireplace</li>}
                    {property.HasGarage && <li>Garage</li>}
                    {property.GarageSpaces > 0 && <li>{property.GarageSpaces} Garage Spaces</li>}
                    {property.HasPool && <li>Swimming Pool</li>}
                    {property.HasBasement && <li>Basement</li>}
                    {property.Stories > 0 && <li>{property.Stories} Stories</li>}
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-3">Interior Features</h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-700">
                    <li>Bedrooms: {property.BedroomsTotal || 'N/A'}</li>
                    <li>Bathrooms: {property.BathroomsTotalInteger || 'N/A'}</li>
                    <li>Living Area: {property.LivingArea ? `${property.LivingArea.toLocaleString()} sq ft` : 'N/A'}</li>
                    {property.HasDining && <li>Dining Room</li>}
                    {property.HasLaundryRoom && <li>Laundry Room</li>}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Contact Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Contact Agent</h3>
          <div className="mb-4">
            <p className="font-bold">{property.ListAgentFullName || 'Agent information not available'}</p>
            {property.ListAgentEmail && <p>{property.ListAgentEmail}</p>}
            {property.ListAgentPhone && <p>{property.ListAgentPhone}</p>}
          </div>

          <button className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors">
            Contact About This Property
          </button>
        </div>

        {/* Back button at bottom for consistency */}
        <div className="text-center mt-8 pt-8 pb-4 border-t border-gray-200">
          <BackToListingsButton className="bg-gray-100 text-black py-2 px-6 rounded-lg border border-black hover:bg-gray-200 transition-colors" />
        </div>
      </div>
    </Layout>
  );
};

ActiveProperty.propTypes = {
  property: PropTypes.object.isRequired
};
