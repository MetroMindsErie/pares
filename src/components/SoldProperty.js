"use client";
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBed, faBath, faRuler, faCalendar, faTag, faHouse } from '@fortawesome/free-solid-svg-icons';
import ImageGallery from './ImageGallery';
import Layout from './Layout';
import BackToListingsButton from './BackToListingsButton';
import BuyerAgent from './Property/BuyerAgent';
import SavePropertyButton from './SavePropertyButton';
import { TaxInformation, HistoryInformation, BuyerFinancingInfo } from './Property/PropertyDataTabs';
import { NeighborhoodCommunity, SchoolsEducation } from './Property/PropertyDataTabs';
import PropertyFactsAndFeatures from './Property/PropertyFactsAndFeatures';
import ComparablePropertiesWidget from './Property/ComparablePropertiesWidget';
import { useAuth } from '../context/auth-context';
import { logPropertyView } from '../services/userActivityService';

export const SoldProperty = ({ property, taxData, historyData }) => {
  const [showRawDetails, setShowRawDetails] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

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

  const ctx = property._localContext || deriveLocalContext(property);
  const hasNeighborhood = ctx && (ctx.subdivision || ctx.communityFeatures?.length || ctx.associationAmenities?.length || ctx.lotFeatures?.length);
  const hasSchools = ctx && Object.values(ctx.schools || {}).some(Boolean);

  const { user } = useAuth();
  useEffect(() => {
    if (user?.id && property?.ListingKey) {
      logPropertyView(user.id, property);
    }
  }, [user?.id, property?.ListingKey]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Buyer Agent Section */}
        <div className="mb-8 pt-4">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Your Buyer Agent</h2>
          <BuyerAgent />
        </div>

        <div className="mb-6 pt-4">
          <BackToListingsButton />
        </div>

        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">{property.UnparsedAddress}</h1>
          <p className="text-base sm:text-xl text-gray-700">
            {property.City}, {property.StateOrProvince} {property.PostalCode}
          </p>
        </div>

        {/* Image Gallery */}
        <div className="mb-8">
          <ImageGallery images={property.mediaUrls || []} address={property.UnparsedAddress} />
        </div>

        {/* Sold Banner */}
        <div className="bg-gray-800 text-white p-4 rounded-lg mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold">This Property Has Been Sold</h2>
            <p className="text-sm opacity-80">Closed on {formatDate(property.CloseDate)}</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-xl sm:text-2xl font-bold">
              {formatPrice(property.ClosePrice || property.ListPrice)}
            </div>

            {/* Save button (still useful to bookmark closed props) */}
            <div>
              <SavePropertyButton
                propertyId={property.ListingKey || property.ListingId || property.id}
                listingKey={property.ListingKey || property.ListingId || property.id}
                address={property.UnparsedAddress}
                price={property.ClosePrice || property.ListPrice}
                imageUrl={property.mediaUrls?.[0] || '/fallback-property.jpg'}
              />
            </div>
          </div>
        </div>

        {/* Pricing tool: nearby comparable properties */}
        <ComparablePropertiesWidget property={property} />

        {/* Property Overview */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-8">
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex overflow-x-auto text-sm">
              {['details','financing','tax','history','neighborhood','schools'].map(id => (
                <button
                  key={id}
                  onClick={()=>setActiveTab(id)}
                  className={`mr-6 py-3 border-b-2 font-medium ${
                    activeTab===id ? 'border-gray-800 text-gray-800' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {id==='details' && 'Property Details'}
                  {id==='financing' && 'Financing'}
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

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg text-center">
                  <FontAwesomeIcon icon={faBed} className="text-blue-500 text-lg sm:text-xl mb-2" />
                  <p className="text-xs sm:text-sm text-gray-500">Bedrooms</p>
                  <p className="font-bold text-sm sm:text-base">{property.BedroomsTotal || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg text-center">
                  <FontAwesomeIcon icon={faBath} className="text-blue-500 text-lg sm:text-xl mb-2" />
                  <p className="text-xs sm:text-sm text-gray-500">Bathrooms</p>
                  <p className="font-bold text-sm sm:text-base">{property.BathroomsTotalInteger || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg text-center">
                  <FontAwesomeIcon icon={faRuler} className="text-blue-500 text-lg sm:text-xl mb-2" />
                  <p className="text-xs sm:text-sm text-gray-500">Living Area</p>
                  <p className="font-bold text-sm sm:text-base">{property.LivingArea ? `${property.LivingArea.toLocaleString()} sq ft` : 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg text-center">
                  <FontAwesomeIcon icon={faCalendar} className="text-blue-500 text-lg sm:text-xl mb-2" />
                  <p className="text-xs sm:text-sm text-gray-500">Year Built</p>
                  <p className="font-bold text-sm sm:text-base">{property.YearBuilt || 'N/A'}</p>
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

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Facts & Features</h3>
                <PropertyFactsAndFeatures property={property} />
              </div>
            </>
          )}
          {activeTab === 'financing' && <BuyerFinancingInfo property={property} />}
          {activeTab === 'tax' && <TaxInformation taxData={taxData} />}
          {activeTab === 'history' && <HistoryInformation historyData={historyData} />}
          {activeTab === 'neighborhood' && <NeighborhoodCommunity context={ctx} />}
          {activeTab === 'schools' && <SchoolsEducation context={ctx} />}
        </div>

        {/* Similar Properties Section - Placeholder */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Similar Properties</h2>
          <p className="text-gray-500">Check out other properties in this area</p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-gray-100 p-4 rounded flex items-center justify-center h-40">
              <p className="text-gray-400">Similar properties coming soon</p>
            </div>
          </div>
        </div>

        {/* Back button at bottom for consistency */}
        <div className="text-center mt-8 pt-8 pb-4 border-t border-gray-200">
          <BackToListingsButton className="bg-gray-100 text-black py-2 px-6 rounded-lg border border-black hover:bg-gray-200 transition-colors" />
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
  taxData: PropTypes.object,
  historyData: PropTypes.object,
};

// helpers
function InfoCard({ title, items, accent }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className={`absolute inset-0 opacity-5 bg-gradient-to-br ${accent}`}></div>
      <div className="p-4">
        <h4 className="font-semibold text-sm mb-2 text-gray-800">{title}</h4>
        <ul className="space-y-1 text-xs text-gray-600 max-h-40 overflow-auto pr-1">
          {items.slice(0, 20).map((i, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="mt-0.5 h-2 w-2 rounded-full bg-gray-400"></span>
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
      <div className="absolute inset-0 bg-gradient-to-br from-gray-600/10 to-gray-800/10 opacity-0 group-hover:opacity-100 transition"></div>
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
      district: p.SchoolDistrict || p.HighSchoolDistrict || null,
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
  
  console.log('🏘️ HOA Debug - Raw property data:', {
    AssociationYN: p.AssociationYN,
    AssociationName: p.AssociationName,
    AssociationPhone: p.AssociationPhone,
    AssociationFee: p.AssociationFee,
    AssociationFeeFrequency: p.AssociationFeeFrequency,
    AssociationFeeIncludes: p.AssociationFeeIncludes,
    AssociationName2: p.AssociationName2,
    AssociationPhone2: p.AssociationPhone2,
    AssociationFee2: p.AssociationFee2,
    AssociationFee2Frequency: p.AssociationFee2Frequency,
    AssociationName3: p.AssociationName3,
    AssociationPhone3: p.AssociationPhone3,
    AssociationFee3: p.AssociationFee3,
    AssociationFee3Frequency: p.AssociationFee3Frequency,
    AssociationAmenities: p.AssociationAmenities
  });
  
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

  console.log('🏘️ HOA Debug - Normalized hasHoa:', hasHoa);
  console.log('🏘️ HOA Debug - Extracted associations:', associations);
  console.log('🏘️ HOA Debug - Amenities:', listFrom(p.AssociationAmenities));

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