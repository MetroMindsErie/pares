"use client";
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBed, faBath, faRuler, faCar, faHouse, faCalendar, faClock } from '@fortawesome/free-solid-svg-icons';
import ImageGallery from './ImageGallery';
import Layout from './Layout';
import BackToListingsButton from './BackToListingsButton';
import BuyerAgent from './Property/BuyerAgent';
import CompanyHeader from './Property/CompanyHeader';
import SavePropertyButton from './SavePropertyButton';
import { TaxInformation, HistoryInformation } from './Property/PropertyDataTabs';
import { NeighborhoodCommunity, SchoolsEducation } from './Property/PropertyDataTabs';
import PropertyFactsAndFeatures from './Property/PropertyFactsAndFeatures';
import ComparablePropertiesWidget from './Property/ComparablePropertiesWidget';
import { useAuth } from '../context/auth-context';
import { logPropertyView } from '../services/userActivityService';

export const PendingProperty = ({ property, taxData, historyData }) => {
  const [activeTab, setActiveTab] = useState('details');

  const { user } = useAuth();

  useEffect(() => {
    if (user?.id && property?.ListingKey) {
      logPropertyView(user.id, property);
    }
  }, [user?.id, property?.ListingKey]);

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

  const ctx = property._localContext || deriveLocalContext(property);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Company Header */}
        <div className="mb-6">
          <CompanyHeader />
        </div>
        
         <div className="mb-8">
          <h2 className="text-xl mt-6 font-semibold mb-4 text-gray-900">Your Real Estate Professional</h2>
          <BuyerAgent />
        </div>
        {/* Back button */}
        <div className="mb-6">
          <BackToListingsButton />
        </div>

        {/* Property Header */}
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

        {/* Status Banner - This is the only section that should differ between property types */}
        <div className="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-lg mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-bold flex items-center">
              <FontAwesomeIcon icon={faClock} className="mr-2" />
              {statusDisplay}
            </h2>
            <p className="text-sm opacity-80 mt-1">This property is currently under contract and pending sale</p>
          </div>

          <div className="text-xl sm:text-2xl font-bold mt-2 md:mt-0 self-start sm:self-center">
            {formatPrice(property.ListPrice)}
          </div>

          {/* Save button */}
          <div className="mt-3 sm:mt-0 sm:ml-4">
            <SavePropertyButton
              propertyId={property.ListingKey || property.ListingId || property.id}
              listingKey={property.ListingKey || property.ListingId || property.id}
              address={property.UnparsedAddress}
              price={property.ListPrice}
              imageUrl={property.mediaUrls?.[0] || '/fallback-property.jpg'}
              propertyData={property}
            />
          </div>
        </div>

        {/* Pricing tool: nearby comparable properties */}
        <ComparablePropertiesWidget property={property} />

        {/* Property Overview Section */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-8">
          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex overflow-x-auto text-sm">
              {['details','tax','history','neighborhood','schools'].map(id => (
                <button
                  key={id}
                  onClick={()=>setActiveTab(id)}
                  className={`mr-6 py-3 border-b-2 font-medium ${
                    activeTab===id ? 'border-yellow-600 text-yellow-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {id==='details' && 'Property Details'}
                  {id==='tax' && 'Tax Information'}
                  {id==='history' && 'History'}
                  {id==='neighborhood' && 'Neighborhood'}
                  {id==='schools' && 'Schools'}
                </button>
              ))}
            </nav>
          </div>

          {activeTab === 'details' && (
            <>
              <h2 className="text-xl sm:text-2xl font-bold mb-6">Property Details</h2>

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

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Facts & Features</h3>
                <PropertyFactsAndFeatures property={property} />
              </div>
            </>
          )}
          {activeTab === 'tax' && <TaxInformation taxData={taxData} />}
          {activeTab === 'history' && <HistoryInformation historyData={historyData} />}
          {activeTab === 'neighborhood' && <NeighborhoodCommunity context={ctx} />}
          {activeTab === 'schools' && <SchoolsEducation context={ctx} />}
        </div>

        {/* Back button at bottom */}
        <div className="text-center mt-8 pt-8 pb-4 border-t border-gray-200">
          <BackToListingsButton className="bg-gray-100 text-black py-2 px-6 rounded-lg border border-black hover:bg-gray-200 transition-colors" />
        </div>
      </div>
    </Layout>
  );
};

PendingProperty.propTypes = {
  property: PropTypes.object.isRequired,
  taxData: PropTypes.object,
  historyData: PropTypes.object
};

export default PendingProperty;

// helper components (local copy)
function InfoCard({ title, items, accent }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className={`absolute inset-0 opacity-5 bg-gradient-to-br ${accent}`}></div>
      <div className="p-4">
        <h4 className="font-semibold text-sm mb-2 text-gray-800">{title}</h4>
        <ul className="space-y-1 text-xs text-gray-600 max-h-40 overflow-auto pr-1">
          {items.slice(0, 20).map((i, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="mt-0.5 h-2 w-2 rounded-full bg-yellow-500"></span>
              <span>{i}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
function SchoolPill({ label, value }) {
  return (
    <div className="group relative rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm hover:shadow-md transition">
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition"></div>
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-800 truncate">{value}</p>
    </div>
  );
}

function deriveLocalContext(p) {
  const label = (name, value) => (value ? `${name}: ${value}` : null);
  const lotSize = p.LotSizeAcres
    ? `${p.LotSizeAcres} acres`
    : p.LotSizeSquareFeet
      ? `${p.LotSizeSquareFeet} sq ft`
      : null;
  return {
    listingKey: p.ListingKey || p.listing_key,
    subdivision: p.SubdivisionName || p.Subdivision || p.Neighborhood || null,
    communityFeatures: listFrom(p.CommunityFeatures),
    associationAmenities: listFrom(p.AssociationAmenities),
    lotFeatures: listFrom(p.LotFeatures),
    areaFacts: [
      label('County', p.CountyOrParish || p.county),
      label('MLS area', p.MLSAreaMajor),
      label('Neighborhood', p.Neighborhood),
      label('Subdivision', p.SubdivisionName || p.Subdivision),
      label('Zoning', p.ZoningDescription),
      label('Property type', p.PropertyType || p.propertyType),
      label('Year built', p.YearBuilt),
    ].filter(Boolean),
    utilitiesFacts: [
      label('Water', p.WaterSource || p.waterSource),
      label('Sewer', p.Sewer || p.sewer),
      label('Utilities', p.Utilities || p.utilities),
      label('Electric', p.Electric),
    ].filter(Boolean),
    lotFacts: [
      label('Lot size', lotSize),
      label('Lot dimensions', p.LotSizeDimensions),
      label('Topography', p.Topography),
      label('View', p.View || p.view),
    ].filter(Boolean),
    hoa: deriveHoa(p),
    schools: {
      district: p.HighSchoolDistrict || p.ElementarySchoolDistrict || p.MiddleOrJuniorSchoolDistrict || null,
      elementaryDistrict: p.ElementarySchoolDistrict || null,
      middleDistrict: p.MiddleOrJuniorSchoolDistrict || null,
      highDistrict: p.HighSchoolDistrict || null,
      elementary: p.ElementarySchool || null,
      middle: p.MiddleOrJuniorSchool || null,
      high: p.HighSchool || null
    },
    taxAnnualAmount: p.TaxAnnualAmount || null
  };
}
function listFrom(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean).map(String);
  return String(raw).split(/[,;]+/).map(s => s.trim()).filter(Boolean);
}

function deriveHoa(p) {
  const hasHoa = normalizeYesNo(p.AssociationYN);
  
  const associations = [
    {
      name: p.AssociationName,
      phone: p.AssociationPhone,
      fee: p.AssociationFee,
      feeFrequency: p.AssociationFeeFrequency,
      feeIncludes: listFrom(p.AssociationFeeIncludes)
    },
    {
      name: p.AssociationName2,
      phone: p.AssociationPhone2,
      fee: p.AssociationFee2,
      feeFrequency: p.AssociationFee2Frequency,
    },
    {
      name: p.AssociationName3,
      phone: p.AssociationPhone3,
      fee: p.AssociationFee3,
      feeFrequency: p.AssociationFee3Frequency,
    }
  ].filter(a => Object.values(a).some(Boolean));

  return {
    hasHoa,
    associations,
    amenities: listFrom(p.AssociationAmenities)
  };
}

function normalizeYesNo(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'boolean') return value;
  const str = String(value).trim().toLowerCase();
  if (['y', 'yes', 'true', '1'].includes(str)) return true;
  if (['n', 'no', 'false', '0'].includes(str)) return false;
  return null;
}
