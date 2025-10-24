import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBed, faBath, faRuler, faCar, faHouse, faCalendar, faClock } from '@fortawesome/free-solid-svg-icons';
import ImageGallery from './ImageGallery';
import Layout from './Layout';
import BackToListingsButton from './BackToListingsButton';
import BuyerAgent from './Property/BuyerAgent';

export const PendingProperty = ({ property }) => {
  const [activeTab, setActiveTab] = useState('details');

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(price);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const statusDisplay = property.StandardStatus === 'ActiveUnderContract' ? 'Under Contract' : 'Pending';

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

       

        {/* Property Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{property.UnparsedAddress}</h1>
          <p className="text-xl text-gray-700">
            {property.City}, {property.StateOrProvince} {property.PostalCode}
          </p>
        </div>

        {/* Image Gallery */}
        <div className="mb-8">
          <ImageGallery images={property.mediaUrls || []} address={property.UnparsedAddress} />
        </div>

        {/* Status Banner - This is the only section that should differ between property types */}
        <div className="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-lg mb-8 flex flex-wrap justify-between items-center">
          <div>
            <h2 className="text-xl font-bold flex items-center">
              <FontAwesomeIcon icon={faClock} className="mr-2" />
              {statusDisplay}
            </h2>
            <p className="text-sm opacity-80 mt-1">This property is currently under contract and pending sale</p>
          </div>
          <div className="text-2xl font-bold mt-2 md:mt-0">
            {formatPrice(property.ListPrice)}
          </div>
        </div>

        {/* Property Overview Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold mb-6">Property Details</h2>

          {/* Property Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <FontAwesomeIcon icon={faBed} className="text-blue-500 text-xl mb-2" />
              <p className="text-sm text-gray-500">Bedrooms</p>
              <p className="font-bold">{property.BedroomsTotal || 'N/A'}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <FontAwesomeIcon icon={faBath} className="text-blue-500 text-xl mb-2" />
              <p className="text-sm text-gray-500">Bathrooms</p>
              <p className="font-bold">{property.BathroomsTotalInteger || 'N/A'}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <FontAwesomeIcon icon={faRuler} className="text-blue-500 text-xl mb-2" />
              <p className="text-sm text-gray-500">Living Area</p>
              <p className="font-bold">{property.LivingArea ? property.LivingArea.toLocaleString() : 'N/A'} sq ft</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <FontAwesomeIcon icon={faCalendar} className="text-blue-500 text-xl mb-2" />
              <p className="text-sm text-gray-500">Year Built</p>
              <p className="font-bold">{property.YearBuilt || 'N/A'}</p>
            </div>
          </div>

          {/* Rest of the property details */}
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
              <h3 className="text-lg font-semibold mb-3">Listing Information</h3>
              <ul className="space-y-2">
                <li>
                  <span className="font-medium">Status:</span>{' '}
                  <span className="text-gray-700">{statusDisplay}</span>
                </li>
                <li>
                  <span className="font-medium">Days on Market:</span>{' '}
                  <span className="text-gray-700">{property.DaysOnMarket || 'N/A'}</span>
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

          {/* Contact Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Contact Agent</h3>
            <div className="mb-4">
              <p className="font-bold">{property.ListAgentFullName || 'Agent information not available'}</p>
              {property.ListAgentEmail && <p>{property.ListAgentEmail}</p>}
              {property.ListAgentPhone && <p>{property.ListAgentPhone}</p>}
            </div>
            
            <button className="bg-yellow-600 text-white py-2 px-4 rounded hover:bg-yellow-700 transition-colors">
              Contact About This Property
            </button>
          </div>
        </div>

        {/* Back button at bottom */}
        <div className="text-center mt-8 pt-8 border-t border-gray-200">
          <BackToListingsButton className="bg-gray-100 text-black py-2 px-6 rounded-lg border border-black hover:bg-gray-200 transition-colors" />
        </div>
      </div>
    </Layout>
  );
};

PendingProperty.propTypes = {
  property: PropTypes.object.isRequired
};

export default PendingProperty;
