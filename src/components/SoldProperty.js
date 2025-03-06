import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBed, faBath, faRuler, faCalendar, faTag, faHouse } from '@fortawesome/free-solid-svg-icons';
import ImageGallery from './ImageGallery';
import Layout from './Layout';

export const SoldProperty = ({ property }) => {
  const [showRawDetails, setShowRawDetails] = useState(false);

  // Format price as currency
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(price);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <Layout>
    <div className="container mx-auto px-4 py-8">
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

      {/* Sold Banner */}
      <div className="bg-gray-800 text-white p-4 rounded-lg mb-8 flex flex-wrap justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">This Property Has Been Sold</h2>
          <p className="text-sm opacity-80">Closed on {formatDate(property.CloseDate)}</p>
        </div>
        <div className="text-2xl font-bold mt-2 md:mt-0">
          {formatPrice(property.ClosePrice || property.ListPrice)}
        </div>
      </div>

      {/* Property Overview */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold mb-6">Property Details</h2>

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
            <p className="font-bold">{property.LivingArea ? `${property.LivingArea.toLocaleString()} sq ft` : 'N/A'}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <FontAwesomeIcon icon={faCalendar} className="text-blue-500 text-xl mb-2" />
            <p className="text-sm text-gray-500">Year Built</p>
            <p className="font-bold">{property.YearBuilt || 'N/A'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">Sale Information</h3>
            <ul className="space-y-2">
              <li className="flex items-start">
                <FontAwesomeIcon icon={faTag} className="text-gray-500 mr-3 mt-1" />
                <div>
                  <span className="font-medium">Original List Price:</span>{' '}
                  <span className="text-gray-700">{formatPrice(property.OriginalListPrice || property.ListPrice)}</span>
                </div>
              </li>
              <li className="flex items-start">
                <FontAwesomeIcon icon={faTag} className="text-gray-500 mr-3 mt-1" />
                <div>
                  <span className="font-medium">Final Sale Price:</span>{' '}
                  <span className="text-gray-700">{formatPrice(property.ClosePrice || property.ListPrice)}</span>
                </div>
              </li>
              <li className="flex items-start">
                <FontAwesomeIcon icon={faCalendar} className="text-gray-500 mr-3 mt-1" />
                <div>
                  <span className="font-medium">Days on Market:</span>{' '}
                  <span className="text-gray-700">{property.DaysOnMarket || 'N/A'}</span>
                </div>
              </li>
              <li className="flex items-start">
                <FontAwesomeIcon icon={faCalendar} className="text-gray-500 mr-3 mt-1" />
                <div>
                  <span className="font-medium">Closing Date:</span>{' '}
                  <span className="text-gray-700">{formatDate(property.CloseDate)}</span>
                </div>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-3">Property Information</h3>
            <ul className="space-y-2">
              <li className="flex items-start">
                <FontAwesomeIcon icon={faHouse} className="text-gray-500 mr-3 mt-1" />
                <div>
                  <span className="font-medium">Property Type:</span>{' '}
                  <span className="text-gray-700">{property.PropertyType || 'Residential'}</span>
                </div>
              </li>
              <li>
                <span className="font-medium">Lot Size:</span>{' '}
                <span className="text-gray-700">
                  {property.LotSizeArea
                    ? `${property.LotSizeArea.toLocaleString()} ${property.LotSizeUnits || 'sq ft'}`
                    : 'N/A'}
                </span>
              </li>
              <li>
                <span className="font-medium">Heating:</span>{' '}
                <span className="text-gray-700">{property.Heating || 'N/A'}</span>
              </li>
              <li>
                <span className="font-medium">Cooling:</span>{' '}
                <span className="text-gray-700">{property.Cooling || 'N/A'}</span>
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

      {/* Similar Properties Section - Placeholder */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Similar Properties</h2>
        <p className="text-gray-500">Check out other properties in this area</p>
        {/* Here you would map through similar properties */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gray-100 p-4 rounded flex items-center justify-center h-40">
            <p className="text-gray-400">Similar properties coming soon</p>
          </div>
        </div>
      </div>
    </div>
    </Layout>
  );
};

// Define independent PropTypes instead of referencing ActiveProperty's PropTypes
SoldProperty.propTypes = {
  property: PropTypes.shape({
    // Basic details
    ListingKey: PropTypes.string,
    UnparsedAddress: PropTypes.string,
    City: PropTypes.string,
    StateOrProvince: PropTypes.string,
    PostalCode: PropTypes.string,
    
    // Measurements
    BedroomsTotal: PropTypes.number,
    BathroomsTotalInteger: PropTypes.number,
    LivingArea: PropTypes.number,
    
    // Prices
    ListPrice: PropTypes.number,
    ClosePrice: PropTypes.number,
    OriginalListPrice: PropTypes.number,
    
    // Dates
    CloseDate: PropTypes.string,
    
    // Features
    PropertyType: PropTypes.string,
    YearBuilt: PropTypes.number,
    LotSizeArea: PropTypes.number,
    LotSizeUnits: PropTypes.string,
    Heating: PropTypes.string,
    Cooling: PropTypes.string,
    HasBasement: PropTypes.bool,
    HasFireplace: PropTypes.bool,
    HasGarage: PropTypes.bool,
    HasPool: PropTypes.bool,
    DaysOnMarket: PropTypes.number,
    
    // Media
    mediaUrls: PropTypes.arrayOf(PropTypes.string),
    
    // Description
    PublicRemarks: PropTypes.string,
  }).isRequired,
};