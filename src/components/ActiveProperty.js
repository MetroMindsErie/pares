"use client";
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBed, faBath, faRuler, faCar, faHouse, faCalendar } from '@fortawesome/free-solid-svg-icons';
import ImageGallery from './ImageGallery';
import BackToListingsButton from './BackToListingsButton';
import Layout from './Layout';
import BuyerAgent from './Property/BuyerAgent';
import CompanyHeader from './Property/CompanyHeader';
import SavePropertyButton from './SavePropertyButton';
import { TaxInformation, HistoryInformation, NeighborhoodCommunity, SchoolsEducation } from './Property/PropertyDataTabs';
import PropertyFactsAndFeatures from './Property/PropertyFactsAndFeatures';
import ComparablePropertiesWidget from './Property/ComparablePropertiesWidget';
import ActiveNearbyPropertiesWidget from './Property/ActiveNearbyPropertiesWidget';
import { useAuth } from '../context/auth-context';
import { logPropertyView } from '../services/userActivityService';

export const ActiveProperty = ({ property, contextLoading, taxData, historyData, variant = 'active' }) => {
  const [activeTab, setActiveTab] = useState('details');

  const extractSpecialListingConditions = (p) =>
    p?.SpecialListingConditions ??
    p?.specialListingConditions ??
    p?.SpecialListingCondition ??
    p?.specialListing_condition;

  const normalizeConditionsToText = (value) => {
    if (!value) return '';
    if (Array.isArray(value)) return value.map(v => String(v || '').trim()).filter(Boolean).join(', ');
    return String(value).trim();
  };

  const hasConditionMatch = (p, test) => {
    const raw = normalizeConditionsToText(extractSpecialListingConditions(p));
    if (!raw) return false;
    const tokens = raw
      .split(/[,;|]/)
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean);
    return tokens.some(test);
  };

  const humanizeSpecialCondition = (raw) => {
    if (!raw) return '';
    const s = String(raw).trim();
    if (!s) return '';
    if (/[\s-]/.test(s)) return s;
    const withSpaces = s
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
    return withSpaces
      .replace(/\bHud\b/g, 'HUD')
      .replace(/\bVa\b/g, 'VA')
      .replace(/\bGse\b/g, 'GSE')
      .replace(/\bReo\b/g, 'REO')
      .replace(/\bNod\b/g, 'NOD')
      .replace(/\bAs Is\b/g, 'As-Is')
      .replace(/\bPre Foreclosure\b/g, 'Pre-Foreclosure')
      .replace(/\bNotice Of Default\b/g, 'Notice Of Default');
  };

  const isReo = hasConditionMatch(property, (t) =>
    t.includes('real estate owned') || t.includes('realestateowned') || t === 'reo' || t.includes('bank owned')
  );
  const isForeclosure = hasConditionMatch(property, (t) =>
    t.includes('foreclosure') || t.includes('in foreclosure') || t.includes('inforeclosure')
  );
  const specialConditionsText = normalizeConditionsToText(extractSpecialListingConditions(property));
  const specialConditionsList = specialConditionsText
    ? specialConditionsText
        .split(/[,;|]/)
        .map((v) => v.trim())
        .filter(Boolean)
        .filter((v) => {
          const lower = v.toLowerCase();
          return lower !== 'standard' && lower !== 'none';
        })
    : [];
  const specialConditionsDisplayList = specialConditionsList
    .map(humanizeSpecialCondition)
    .filter(Boolean);

  const normalizedSpecialTokens = specialConditionsList
    .flatMap((v) => {
      const raw = String(v || '').trim();
      const display = humanizeSpecialCondition(raw);
      return [raw, display]
        .filter(Boolean)
        .map((x) => String(x).toLowerCase());
    })
    .filter(Boolean);

  const hasSpecialToken = (needle) =>
    normalizedSpecialTokens.some((t) => t === needle || t.includes(needle));

  const buildInvestorSnapshotCards = () => {
    const cards = [];

    if (hasSpecialToken('real estate owned') || hasSpecialToken('realestateowned') || hasSpecialToken('reo')) {
      cards.push({
        title: 'REO (Bank Owned)'
      , items: [
          'Expect “as-is” condition; budget for repairs and inspections.',
          'Ask about bank addenda, deadlines, and required forms.',
          'Confirm occupancy and utilities before inspections.'
        ]
      });
    }

    if (hasSpecialToken('in foreclosure') || hasSpecialToken('inforeclosure') || hasSpecialToken('foreclosure')) {
      cards.push({
        title: 'Foreclosure'
      , items: [
          'Timelines can be strict; confirm deadlines and deposit rules.',
          'Title / lien review is critical; verify redemption/possession details.',
          'Contingencies may be limited; verify showing/inspection access.'
        ]
      });
    }

    if (hasSpecialToken('hud owned') || hasSpecialToken('hudowned')) {
      cards.push({
        title: 'HUD Owned'
      , items: [
          'Check bidding periods and owner-occupant restrictions.',
          'Confirm eligibility/financing requirements before offering.',
          'Review HUD addenda and repair escrow rules (if applicable).'
        ]
      });
    }

    if (hasSpecialToken('auction')) {
      cards.push({
        title: 'Auction'
      , items: [
          'Verify auction terms, deposits, buyer premiums, and timelines.',
          'Contingencies are often limited; know what you’re buying.',
          'Confirm access for inspections and occupancy status.'
        ]
      });
    }

    if (hasSpecialToken('probate listing') || hasSpecialToken('probatelisting') || hasSpecialToken('probate')) {
      cards.push({
        title: 'Probate'
      , items: [
          'Court approval may extend timelines; plan for delays.',
          'Confirm executor/trustee authority and required disclosures.',
          '“As-is” sales are common; budget for repairs.'
        ]
      });
    }

    if (hasSpecialToken('bankruptcy property') || hasSpecialToken('bankruptcyproperty') || hasSpecialToken('bankruptcy')) {
      cards.push({
        title: 'Bankruptcy'
      , items: [
          'Sale may require court/creditor approval; expect longer timelines.',
          'Title review is important; confirm liens and required filings.',
          'Ask listing agent about approval process and closing constraints.'
        ]
      });
    }

    if (hasSpecialToken('notice of default') || hasSpecialToken('noticeofdefault') || hasSpecialToken('nod')) {
      cards.push({
        title: 'Notice Of Default'
      , items: [
          'Verify the foreclosure stage and any cure/notice timelines.',
          'Title and payoff verification are essential.',
          'Expect additional negotiations and documentation.'
        ]
      });
    }

    if (hasSpecialToken('short sale') || hasSpecialToken('shortsale')) {
      cards.push({
        title: 'Short Sale'
      , items: [
          'Lender approval required; response times can be long.',
          'Confirm approved price and lienholder terms before committing.',
          'Plan for extended closing windows.'
        ]
      });
    }

    if (hasSpecialToken('third party approval') || hasSpecialToken('thirdpartyapproval')) {
      cards.push({
        title: 'Third Party Approval'
      , items: [
          'Offer acceptance may depend on external approval (HOA, lender, court, etc.).',
          'Confirm the approval authority and expected timeline.',
          'Avoid tight close dates until approved.'
        ]
      });
    }

    if (hasSpecialToken('trust')) {
      cards.push({
        title: 'Trust'
      , items: [
          'Confirm trustee authority and required signatures.',
          'Request any trust-related disclosures early.',
          'Timelines may vary depending on beneficiary requirements.'
        ]
      });
    }

    // Always include a general diligence card when special conditions exist.
    if (specialConditionsList.length > 0) {
      cards.push({
        title: 'Due Diligence'
      , items: [
          'Review agent remarks for special instructions and addenda.',
          'Verify property condition, occupancy, and utilities for inspections.',
          'Run title/lien checks and validate required disclosures.'
        ]
      });
    }

    // Deduplicate by title in case multiple tokens match
    return cards.filter((c, idx) => cards.findIndex((x) => x.title === c.title) === idx);
  };

  // Format price as currency
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(price);
  };

  const ctx = property._localContext || deriveLocalContext(property);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id && property?.ListingKey) {
      logPropertyView(user.id, property);
    }
  }, [user?.id, property?.ListingKey]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Company Header */}
        <div className="mb-6">
          <CompanyHeader />
        </div>

        {(variant === 'special' || specialConditionsList.length > 0) && (
          <div className="mb-8 rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-teal-50 p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Special Listing Conditions</h2>
                <p className="text-sm text-gray-700 mt-1">
                  This listing includes special terms or status indicators. Review agent remarks and disclosures carefully.
                </p>
              </div>
              {(isReo || isForeclosure) && (
                <div className="flex gap-2">
                  {isReo && (
                    <span className="inline-flex items-center rounded-full bg-purple-600 px-3 py-1 text-xs font-semibold text-white">
                      REO
                    </span>
                  )}
                  {isForeclosure && (
                    <span className="inline-flex items-center rounded-full bg-orange-600 px-3 py-1 text-xs font-semibold text-white">
                      Foreclosure
                    </span>
                  )}
                </div>
              )}
            </div>

            {specialConditionsDisplayList.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {specialConditionsDisplayList.map((cond) => (
                  <span
                    key={cond}
                    className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-900 border border-purple-200"
                  >
                    {cond}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
        
        <div className="mb-8">
          <h2 className="text-xl mt-6 font-semibold mb-4 text-gray-900">Your Real Estate Professional</h2>
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

        {/* Similar active listings */}
        <ActiveNearbyPropertiesWidget property={property} />
        
        {/* Pricing tool: nearby comparable properties */}
        <ComparablePropertiesWidget property={property} />

        {/* Property Overview */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-teal-700 mb-2 sm:mb-0">
              {formatPrice(property.ListPrice)}
            </h2>

            <div className="flex items-center gap-4 mt-2 md:mt-0">
              <div className="flex flex-wrap gap-x-4 gap-y-2">
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

              {/* Save button */}
              <div className="flex-shrink-0">
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
          </div>

          {/* Status Badge */}
          <div className="inline-block bg-green-100 text-green-800 rounded-full px-3 py-1 text-sm font-medium mb-6">
            Active Listing
          </div>

          {specialConditionsList.length > 0 && (
            <div className="mb-6 rounded-xl border border-orange-200 bg-orange-50 p-4">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {isReo && (
                  <span className="inline-flex items-center rounded-full bg-purple-600 px-3 py-1 text-xs font-semibold text-white">
                    REO
                  </span>
                )}
                {isForeclosure && (
                  <span className="inline-flex items-center rounded-full bg-orange-600 px-3 py-1 text-xs font-semibold text-white">
                    Foreclosure
                  </span>
                )}
                <span className="text-sm font-semibold text-gray-900">Investor Snapshot</span>
              </div>

              {specialConditionsDisplayList.length > 0 && (
                <p className="text-sm text-gray-800 mb-3">
                  <span className="font-semibold">Special conditions:</span> {specialConditionsDisplayList.join(', ')}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg bg-white p-3 border border-orange-100">
                  <div className="text-gray-500">List price</div>
                  <div className="font-semibold text-gray-900">{property?.ListPrice ? formatPrice(property.ListPrice) : 'N/A'}</div>
                </div>
                <div className="rounded-lg bg-white p-3 border border-orange-100">
                  <div className="text-gray-500">Days on market</div>
                  <div className="font-semibold text-gray-900">{property?.DaysOnMarket ?? property?.CumulativeDaysOnMarket ?? 'N/A'}</div>
                </div>
                <div className="rounded-lg bg-white p-3 border border-orange-100">
                  <div className="text-gray-500">Tax (annual)</div>
                  <div className="font-semibold text-gray-900">{property?.TaxAnnualAmount ? formatPrice(property.TaxAnnualAmount) : 'N/A'}</div>
                </div>
                <div className="rounded-lg bg-white p-3 border border-orange-100">
                  <div className="text-gray-500">Sq ft</div>
                  <div className="font-semibold text-gray-900">{property?.LivingArea ? property.LivingArea.toLocaleString() : 'N/A'}</div>
                </div>
                <div className="rounded-lg bg-white p-3 border border-orange-100">
                  <div className="text-gray-500">Year built</div>
                  <div className="font-semibold text-gray-900">{property?.YearBuilt || 'N/A'}</div>
                </div>
                <div className="rounded-lg bg-white p-3 border border-orange-100">
                  <div className="text-gray-500">Occupancy</div>
                  <div className="font-semibold text-gray-900">{property?.OccupantType || property?.OwnerOccupiedYN || 'N/A'}</div>
                </div>
              </div>

              {(() => {
                const cards = buildInvestorSnapshotCards();
                if (!cards.length) return null;
                return (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {cards.map((card) => (
                      <div key={card.title} className="rounded-lg bg-white p-4 border border-orange-100">
                        <div className="font-semibold text-gray-900 mb-2">{card.title}</div>
                        <ul className="text-sm text-gray-700 space-y-1">
                          {card.items.map((item) => (
                            <li key={item}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex overflow-x-auto text-sm">
              {['details','tax','history','neighborhood','schools'].map(id => (
                <button
                  key={id}
                  onClick={()=>setActiveTab(id)}
                  className={`mr-6 py-3 border-b-2 font-medium ${
                    activeTab===id ? 'border-teal-700 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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

          {/* Tab panels */}
          {activeTab === 'details' && (
            <>
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

        {/* Contact Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Contact Agent</h3>
          <div className="mb-4">
            <p className="font-bold">{property.ListAgentFullName || 'Agent information not available'}</p>
            {property.ListAgentEmail && <p>{property.ListAgentEmail}</p>}
            {property.ListAgentPhone && <p>{property.ListAgentPhone}</p>}
          </div>

          <button className="bg-teal-600 text-white py-2 px-4 rounded hover:bg-teal-700 transition-colors">
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
  property: PropTypes.object.isRequired,
  taxData: PropTypes.object,
  historyData: PropTypes.object,
  contextLoading: PropTypes.bool,
  variant: PropTypes.oneOf(['active', 'special'])
};

// helper to derive context from property if SSR/client fetch not available
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
