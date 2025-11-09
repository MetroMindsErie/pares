import React, { useState } from 'react';
import Head from 'next/head';
import { SoldProperty } from '../../components/SoldProperty';
import PropertyView from '../../components/Property/PropertyView';
import axios from 'axios';
import BuyerAgent from '../../components/Property/BuyerAgent';
import { PendingProperty } from '../../components/PendingProperty';
import { ActiveProperty } from '../../components/ActiveProperty';

// Extract tax information from Trestle property data
const extractTaxData = (property) => {
  try {
    return {
      ownerInformation: {
        ownerName: property.OwnerName || "Property Owner",
        mailingAddress: property.OwnerMailingAddress || property.UnparsedAddress || "Address not available",
        taxBillingCity: property.City ? `${property.City} ${property.StateOrProvince || 'PA'}` : "City PA",
        taxBillingZip: property.PostalCode || "16508",
        taxBillingZipPlus4: property.PostalCodePlus4 || "1557",
        ownerOccupied: property.OwnerOccupiedYN || "Unknown"
      },
      locationInformation: {
        schoolDistrict: property.HighSchoolDistrict || property.SchoolDistrict || "School District",
        censusTrack: property.CensusTract || "Unknown",
        carrierRoute: property.CarrierRoute || "Unknown",
        subdivision: property.CountrySubdivision || property.Subdivision || "Unknown",
        zoning: property.ZoningDescription || "Un",
        mapPageGrid: property.X_GeocodeSource || "Unknown",
        topography: property.Topography || "Unknown"
      },
      estimatedValue: {
        realAVM: property.ListPrice ? `$${property.ListPrice.toLocaleString()}` : "$0",
        realAVMRangeHigh: property.ListPrice ? `$${Math.round(property.ListPrice * 1.25).toLocaleString()}` : "$0",
        realAVMRangeLow: property.ListPrice ? `$${Math.round(property.ListPrice * 0.75).toLocaleString()}` : "$0",
        valueAsOf: property.ListingContractDate || new Date().toLocaleDateString(),
        confidenceScore: "N/A",
        forecastStandardDeviation: "N/A"
      },
      taxInformation: {
        taxId: property.ParcelNumber || property.TaxParcelId || "Unknown",
        percentImproved: property.TaxLotSizeAcres ? "Unknown" : "Unknown",
        taxArea: property.TaxParcelId?.split('-')[0] || "Unknown",
        lotNumber: property.ParcelNumber || "Unknown",
        legalDescription: property.LegalDescription || "Legal description not available",
        townshipTax: property.TaxAnnualAmount ? `$${(property.TaxAnnualAmount * 0.4).toLocaleString()}` : "$0",
        countyTax: property.TaxAnnualAmount ? `$${(property.TaxAnnualAmount * 0.2).toLocaleString()}` : "$0",
        schoolTax: property.TaxAnnualAmount ? `$${(property.TaxAnnualAmount * 0.4).toLocaleString()}` : "$0",
        taxYear: property.TaxYear || new Date().getFullYear().toString()
      },
      assessmentAndTaxes: {
        assessmentYears: [new Date().getFullYear().toString(), (new Date().getFullYear() - 1).toString(), (new Date().getFullYear() - 2).toString()],
        assessedValueTotal: [
          property.TaxAssessedValue ? `$${property.TaxAssessedValue.toLocaleString()}` : "$0",
          property.TaxAssessedValue ? `$${property.TaxAssessedValue.toLocaleString()}` : "$0",
          property.TaxAssessedValue ? `$${property.TaxAssessedValue.toLocaleString()}` : "$0"
        ],
        assessedValueLand: [
          property.TaxAssessedValue ? `$${Math.round(property.TaxAssessedValue * 0.25).toLocaleString()}` : "$0",
          property.TaxAssessedValue ? `$${Math.round(property.TaxAssessedValue * 0.25).toLocaleString()}` : "$0",
          property.TaxAssessedValue ? `$${Math.round(property.TaxAssessedValue * 0.25).toLocaleString()}` : "$0"
        ],
        assessedValueImproved: [
          property.TaxAssessedValue ? `$${Math.round(property.TaxAssessedValue * 0.75).toLocaleString()}` : "$0",
          property.TaxAssessedValue ? `$${Math.round(property.TaxAssessedValue * 0.75).toLocaleString()}` : "$0",
          property.TaxAssessedValue ? `$${Math.round(property.TaxAssessedValue * 0.75).toLocaleString()}` : "$0"
        ],
        yoyAssessedChange: ["$0", "$0", "$0"],
        yoyAssessedChangePercent: ["0%", "0%", "0%"],
        marketValueTotal: [
          property.ListPrice ? `$${property.ListPrice.toLocaleString()}` : "$0",
          property.ListPrice ? `$${property.ListPrice.toLocaleString()}` : "$0",
          property.ListPrice ? `$${property.ListPrice.toLocaleString()}` : "$0"
        ],
        marketValueLand: [
          property.ListPrice ? `$${Math.round(property.ListPrice * 0.25).toLocaleString()}` : "$0",
          property.ListPrice ? `$${Math.round(property.ListPrice * 0.25).toLocaleString()}` : "$0",
          property.ListPrice ? `$${Math.round(property.ListPrice * 0.25).toLocaleString()}` : "$0"
        ],
        marketValueImproved: [
          property.ListPrice ? `$${Math.round(property.ListPrice * 0.75).toLocaleString()}` : "$0",
          property.ListPrice ? `$${Math.round(property.ListPrice * 0.75).toLocaleString()}` : "$0",
          property.ListPrice ? `$${Math.round(property.ListPrice * 0.75).toLocaleString()}` : "$0"
        ]
      }
    };
  } catch (error) {
    console.error('Error extracting tax data:', error);
    return getMockTaxData();
  }
};

// Extract history data from Trestle property data
const extractHistoryData = (property) => {
  try {
    // Format dates properly
    const formatDate = (dateString) => {
      if (!dateString) return new Date().toLocaleDateString();
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString();
      } catch {
        return new Date().toLocaleDateString();
      }
    };

    const formatDateTime = (dateString) => {
      if (!dateString) return new Date().toLocaleDateString() + " @ " + new Date().toLocaleTimeString();
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString() + " @ " + date.toLocaleTimeString();
      } catch {
        return new Date().toLocaleDateString() + " @ " + new Date().toLocaleTimeString();
      }
    };

    // Extract listing history - use property images if available
    const propertyImage = property.mediaUrls && property.mediaUrls.length > 0 
      ? property.mediaUrls[0] 
      : "/fallback-property.jpg";

    const listingHistory = [{
      dom: property.DaysOnMarket?.toString() || "0",
      changeType: property.StandardStatus === 'Active' ? "New Listing" : 
                 property.StandardStatus === 'Closed' ? "Sold" : 
                 property.StandardStatus || "New Listing",
      price: property.ListPrice ? `$${property.ListPrice.toLocaleString()}` : "$0",
      changeDetails: property.StandardStatus === 'Active' ? "->ACT" : 
                    property.StandardStatus === 'Closed' ? "->SOLD" : 
                    "->LIST",
      whenChanged: formatDateTime(property.ModificationTimestamp || property.ListingContractDate),
      effDate: formatDate(property.ListingContractDate),
      modBy: property.ListAgentMlsId || property.ListOfficeMlsId || "AGENT",
      propType: property.PropertyType || "RES",
      address: property.UnparsedAddress || "Address not available",
      listingId: property.ListingKey || "Unknown",
      imageUrl: propertyImage
    }];

    // Add additional listing history entries if we have price changes or status changes
    if (property.OriginalListPrice && property.OriginalListPrice !== property.ListPrice) {
      listingHistory.unshift({
        dom: (property.DaysOnMarket ? property.DaysOnMarket + 30 : 30).toString(),
        changeType: "Price Change",
        price: property.OriginalListPrice ? `$${property.OriginalListPrice.toLocaleString()}` : "$0",
        changeDetails: "->PRICE",
        whenChanged: formatDateTime(property.ListingContractDate),
        effDate: formatDate(property.ListingContractDate),
        modBy: property.ListAgentMlsId || property.ListOfficeMlsId || "AGENT",
        propType: property.PropertyType || "RES",
        address: property.UnparsedAddress || "Address not available",
        listingId: property.ListingKey || "Unknown",
        imageUrl: propertyImage
      });
    }

    // Extract sale history from Trestle data
    const saleHistory = [];

    // Primary sale record (most recent/current)
    if (property.ClosePrice && property.CloseDate) {
      saleHistory.push({
        recDate: formatDate(property.CloseDate),
        saleDate: formatDate(property.CloseDate),
        salePrice: `$${property.ClosePrice.toLocaleString()}`,
      });
    }

    // Historical sales from Trestle (if available in property data)
    if (property.PreviousSales && Array.isArray(property.PreviousSales)) {
      property.PreviousSales.forEach(sale => {
        saleHistory.push({
          recDate: formatDate(sale.RecordingDate || sale.SaleDate),
          saleDate: formatDate(sale.SaleDate),
          salePrice: sale.SalePrice ? `$${sale.SalePrice.toLocaleString()}` : "Price Not Available",
        });
      });
    }

    // Alternative: Check for individual historical sale fields
    if (property.PriorSalePrice && property.PriorSaleDate) {
      saleHistory.push({
        recDate: formatDate(property.PriorSaleRecordingDate || property.PriorSaleDate),
        saleDate: formatDate(property.PriorSaleDate),
        salePrice: `$${property.PriorSalePrice.toLocaleString()}`,
      });
    }

    // Check for additional sale history fields that might exist in Trestle

    if (property.PreviousSalePrice && property.PreviousSaleDate) {
      saleHistory.push({
        recDate: formatDate(property.PreviousSaleRecordingDate || property.PreviousSaleDate),
        saleDate: formatDate(property.PreviousSaleDate),
        salePrice: `$${property.PreviousSalePrice.toLocaleString()}`,
      });
    }

    return {
      listingHistory,
      saleHistory,
    };
  } catch (error) {
    console.error('Error extracting history data:', error);
    return getMockHistoryData();
  }
};

// Tax Information Component
const TaxInformation = ({ taxData }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Tax Information</h2>
      
      {/* Owner Information */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-blue-600 border-b border-blue-200 pb-2">
          Owner Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <span className="text-sm font-medium text-gray-500">Owner Name:</span>
            <p className="text-gray-900">{taxData.ownerInformation.ownerName}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500">Mailing Address:</span>
            <p className="text-gray-900">{taxData.ownerInformation.mailingAddress}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500">Tax Billing City & State:</span>
            <p className="text-gray-900">{taxData.ownerInformation.taxBillingCity}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500">Tax Billing Zip:</span>
            <p className="text-gray-900">{taxData.ownerInformation.taxBillingZip}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500">Owner Occupied:</span>
            <p className="text-gray-900">{taxData.ownerInformation.ownerOccupied}</p>
          </div>
        </div>
      </div>

      {/* Location Information */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-blue-600 border-b border-blue-200 pb-2">
          Location Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <span className="text-sm font-medium text-gray-500">School District:</span>
            <p className="text-gray-900">{taxData.locationInformation.schoolDistrict}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500">Census Track:</span>
            <p className="text-gray-900">{taxData.locationInformation.censusTrack}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500">Zoning:</span>
            <p className="text-gray-900">{taxData.locationInformation.zoning}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500">Subdivision:</span>
            <p className="text-gray-900">{taxData.locationInformation.subdivision}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500">Map Page/Grid:</span>
            <p className="text-gray-900">{taxData.locationInformation.mapPageGrid}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500">Topography:</span>
            <p className="text-gray-900">{taxData.locationInformation.topography}</p>
          </div>
        </div>
      </div>

      {/* Tax Information */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-blue-600 border-b border-blue-200 pb-2">
          Tax Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <span className="text-sm font-medium text-gray-500">Tax ID:</span>
            <p className="text-gray-900">{taxData.taxInformation.taxId}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500">Legal Description:</span>
            <p className="text-gray-900">{taxData.taxInformation.legalDescription}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500">Township Tax:</span>
            <p className="text-gray-900 font-semibold">{taxData.taxInformation.townshipTax}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500">County Tax:</span>
            <p className="text-gray-900 font-semibold">{taxData.taxInformation.countyTax}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500">School Tax:</span>
            <p className="text-gray-900 font-semibold">{taxData.taxInformation.schoolTax}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500">Tax Year:</span>
            <p className="text-gray-900">{taxData.taxInformation.taxYear}</p>
          </div>
        </div>
      </div>

      {/* Assessment & Taxes Table */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-blue-600 border-b border-blue-200 pb-2">
          Assessment & Taxes
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assessment Year
                </th>
                {taxData.assessmentAndTaxes.assessmentYears.map((year) => (
                  <th key={year} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {year}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Assessed Value - Total
                </td>
                {taxData.assessmentAndTaxes.assessedValueTotal.map((value, index) => (
                  <td key={index} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {value}
                  </td>
                ))}
              </tr>
              <tr className="bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Assessed Value - Land
                </td>
                {taxData.assessmentAndTaxes.assessedValueLand.map((value, index) => (
                  <td key={index} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {value}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Assessed Value - Improved
                </td>
                {taxData.assessmentAndTaxes.assessedValueImproved.map((value, index) => (
                  <td key={index} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {value}
                  </td>
                ))}
              </tr>
              <tr className="bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Market Value - Total
                </td>
                {taxData.assessmentAndTaxes.marketValueTotal.map((value, index) => (
                  <td key={index} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {value}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// History Information Component  
const HistoryInformation = ({ historyData }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Property History</h2>
      
      {/* Listing History */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-blue-600 border-b border-blue-200 pb-2">
          Listing History from MLS
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  DOM
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Change Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Change Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  When Changed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Eff Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mod By
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {historyData.listingHistory.map((listing, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {listing.dom}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                    {listing.changeType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {listing.price}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {listing.changeDetails}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {listing.whenChanged}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {listing.effDate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                    {listing.modBy}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Property Info Row */}
        {historyData.listingHistory.length > 0 && (
          <div className="mt-4 flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <img 
              src={historyData.listingHistory[0]?.imageUrl || "/fallback-property.jpg"} 
              alt="Property" 
              className="w-16 h-16 object-cover rounded-lg"
              onError={(e) => {
                e.target.src = '/fallback-property.jpg';
              }}
            />
            <div>
              <p className="font-medium text-gray-900">
                {historyData.listingHistory[0]?.listingId} - Prop Type: {historyData.listingHistory[0]?.propType}
              </p>
              <p className="text-gray-600">{historyData.listingHistory[0]?.address}</p>
            </div>
          </div>
        )}
      </div>

      {/* Sale History */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-blue-600 border-b border-blue-200 pb-2">
          Sale History from Public Records
        </h3>
        {historyData.saleHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rec. Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sale Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sale Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nom.Buyer Name(s)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Seller Name(s)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Doc. #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document Type
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {historyData.saleHistory.map((sale, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.recDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.saleDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {sale.salePrice}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.nomBuyerNames}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.sellerNames}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.titleCompany}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                      {sale.docNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.documentType}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No sale history available for this property.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced Property Detail Component with Tabs
const PropertyDetailWithTabs = ({ property, isSold, taxData, historyData }) => {
  const [activeTab, setActiveTab] = useState('details');

  const tabs = [
    { id: 'details', label: 'Property Details', icon: '🏠' },
    { id: 'tax', label: 'Tax Information', icon: '📊' },
    { id: 'history', label: 'History', icon: '📋' }
  ];

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button at top of content */}
        <div className="mb-6">
          {/* <BackToListingsButton /> */}
        </div>

        {/* Tab Navigation - Fixed structure */}
        <div className="border-b border-gray-200 mb-6 sm:mb-8">
          <nav className="-mb-px flex space-x-4 sm:space-x-6 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="text-base sm:text-lg">{tab.icon}</span>
                <span className="text-xs sm:text-sm">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Buyer Agent Section - Always visible */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Your Buyer Agent</h2>
          <BuyerAgent />
        </div>

        {/* Tab Content */}
        {activeTab === 'details' && (
          <>
            {isSold ? (
              <SoldProperty property={property} />
            ) : (
              <PropertyView propertyData={property} mlsData={property} />
            )}
          </>
        )}

        {activeTab === 'tax' && (
          <TaxInformation taxData={taxData} />
        )}

        {activeTab === 'history' && (
          <HistoryInformation historyData={historyData} />
        )}

        {/* Back button at bottom for consistency */}
        <div className="text-center mt-8 pt-8 border-t border-gray-200">
          {/* <BackToListingsButton className="bg-gray-100 text-black py-2 px-6 rounded-lg border border-black hover:bg-gray-200 transition-colors" /> */}
        </div>
      </div>
    </div>
  );
};

export async function getServerSideProps({ params }) {
  const { id } = params;
  
  try {
    // Get Trestle access token
    const tokenResponse = await axios.post(
      'https://api-trestle.corelogic.com/trestle/oidc/connect/token',
      new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'api',
        client_id: process.env.NEXT_PUBLIC_TRESTLE_CLIENT_ID,
        client_secret: process.env.NEXT_PUBLIC_TRESTLE_CLIENT_SECRET,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    const token = tokenResponse.data.access_token;

    // Fetch property and media data
    const [propertyResponse, mediaResponse] = await Promise.all([
      axios.get(
        `https://api-trestle.corelogic.com/trestle/odata/Property?$filter=ListingKey eq '${params.id}'`,
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
      ),
      axios.get(
        `https://api-trestle.corelogic.com/trestle/odata/Media?$filter=ResourceRecordKey eq '${params.id}'&$orderby=Order`,
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
      )
    ]);

    if (!propertyResponse.data.value?.length) {
      return { notFound: true };
    }
    
    const rawProperty = propertyResponse.data.value[0];
    const isSold = rawProperty.StandardStatus?.toLowerCase() === 'closed';

    // Create media URLs array
    const mediaUrls = (mediaResponse?.data?.value || [])
      .map(media => media.MediaURL)
      .filter(url => url && url.startsWith('http'));

    // Add fallback if no images
    if (!mediaUrls.length) {
      mediaUrls.push('/fallback-property.jpg');
    }

    // Include both original and transformed property data
    const transformedProperty = {
      // Original raw property fields
      ...rawProperty,
      
      // Additional transformed fields
      waterSource: rawProperty.WaterSource || 'Unknown',
      sewer: rawProperty.Sewer || 'Unknown',
      propertyType: rawProperty.PropertyType || 'Unknown',
      zoningDescription: rawProperty.ZoningDescription || 'Unknown',
      daysOnMarket: rawProperty.DaysOnMarket || 0,
      flooring: rawProperty.Flooring || 'Unknown',
      cooling: rawProperty.Cooling || 'Unknown',
      heating: rawProperty.Heating || 'Unknown',
      interiorFeatures: rawProperty.InteriorFeatures || 'Unknown',
      exteriorFeatures: rawProperty.ExteriorFeatures || 'Unknown',
      appliances: rawProperty.Appliances || 'Unknown',
      lotsizedimension: rawProperty.LotSizeDimensions || 'Unknown',
      fireplacefeatures: rawProperty.FireplaceFeatures || 'Unknown',
      pool: rawProperty.PoolPrivateYN || 'Unknown',
      view: rawProperty.View || 'Unknown',
      construction: rawProperty.ConstructionMaterials || 'Unknown',
      roof: rawProperty.Roof || 'Unknown',
      style: rawProperty.ArchitecturalStyle || 'Unknown',
      highschool: rawProperty.HighSchoolDistrict || 'Unknown',
      middleschool: rawProperty.MiddleOrJuniorSchoolDistrict || 'Unknown',
      mlsNumber: rawProperty.ListingKey || null,
      address: rawProperty.UnparsedAddress || 'Address not available',
      price: rawProperty.ListPrice || 0,
      bedrooms: rawProperty.BedroomsTotal || 0,
      bathrooms: rawProperty.BathroomsTotalInteger || 0,
      sqft: rawProperty.LivingArea || 0,
      lotSize: rawProperty.LotSizeAcres || 0,
      description: rawProperty.PublicRemarks || 'No description available',
      parkingFeatures: rawProperty.ParkingFeatures || 'Unknown',
      foundationDetails: rawProperty.FoundationDetails || 'Unknown',
      basement: rawProperty.Basement || 'Unknown',
      utilities: rawProperty.Utilities || 'Unknown',
      features: [
        rawProperty.GarageSpaces ? `${rawProperty.GarageSpaces} car garage` : null,
        rawProperty.RoofMaterialType || null,
        rawProperty.FireplaceNumber > 0 ? `${rawProperty.FireplaceNumber} fireplaces` : null
      ].filter(Boolean),
      taxes: rawProperty.TaxAnnualAmount || 0,
      agent: {
        name: 'John Easter',
        brokerage: 'Pennington Lines', 
        photo: '/default-agent.jpg',
        phone: '814-873-5810',
        email: 'easterjo106@yahoo.com'
      },
      
      // Image arrays - both formats for compatibility
      mediaUrls: mediaUrls,
      images: mediaUrls,
      
      // Sold property specific fields
      ...(isSold && {
        soldPrice: rawProperty.ClosePrice || 0,
        soldDate: rawProperty.CloseDate ?
          new Date(rawProperty.CloseDate).toLocaleDateString() :
          'Date not available',
        buyerAgent: 'John Easter' // Override buyer agent too
      })
    };

    // Extract tax data with fallback
    let taxData;
    try {
      taxData = extractTaxData(transformedProperty);
    } catch (error) {
      console.error('Failed to extract tax data, using mock data:', error);
      taxData = getMockTaxData();
    }

    // Extract history data with fallback
    let historyData;
    try {
      historyData = extractHistoryData(transformedProperty);
    } catch (error) {
      console.error('Failed to extract history data, using mock data:', error);
      historyData = getMockHistoryData();
    }

    // Fetch local context (neighborhood + schools) with same token
    try {
      const { data: ctxResp } = await axios.get(
        `https://api-trestle.corelogic.com/trestle/odata/Property`,
        {
          params: {
            $filter: `ListingKey eq '${params.id}'`,
            $select: [
              'ListingKey',
              'SubdivisionName',
              'Subdivision',
              'Neighborhood',
              'CommunityFeatures',
              'AssociationAmenities',
              'LotFeatures',
              'ElementarySchool',
              'MiddleOrJuniorSchool',
              'HighSchool',
              'SchoolDistrict',
              'HighSchoolDistrict',
              'TaxAnnualAmount'
            ].join(',')
          },
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
        }
      );

      const ctxValue = Array.isArray(ctxResp?.value) ? ctxResp.value[0] : null;
      if (ctxValue) {
        transformedProperty._localContext = {
          listingKey: ctxValue.ListingKey,
          subdivision: ctxValue.SubdivisionName || ctxValue.Subdivision || ctxValue.Neighborhood || null,
          communityFeatures: splitListSafe(ctxValue.CommunityFeatures),
          associationAmenities: splitListSafe(ctxValue.AssociationAmenities),
          lotFeatures: splitListSafe(ctxValue.LotFeatures),
          schools: {
            district: ctxValue.SchoolDistrict || ctxValue.HighSchoolDistrict || null,
            elementary: ctxValue.ElementarySchool || null,
            middle: ctxValue.MiddleOrJuniorSchool || null,
            high: ctxValue.HighSchool || null
          },
          taxAnnualAmount: ctxValue.TaxAnnualAmount || null
        };
      }
    } catch (e) {
      console.warn('Local context fetch failed:', e?.response?.status || e.message);
    }

    // Fallback: derive context from already-fetched property if API returned nothing
    if (!transformedProperty._localContext) {
      transformedProperty._localContext = {
        listingKey: transformedProperty.ListingKey || params.id,
        subdivision: transformedProperty.SubdivisionName || transformedProperty.Subdivision || transformedProperty.Neighborhood || null,
        communityFeatures: splitListSafe(transformedProperty.CommunityFeatures),
        associationAmenities: splitListSafe(transformedProperty.AssociationAmenities),
        lotFeatures: splitListSafe(transformedProperty.LotFeatures),
        schools: {
          district: transformedProperty.SchoolDistrict || transformedProperty.HighSchoolDistrict || null,
          elementary: transformedProperty.ElementarySchool || null,
          middle: transformedProperty.MiddleOrJuniorSchool || null,
          high: transformedProperty.HighSchool || null
        },
        taxAnnualAmount: transformedProperty.TaxAnnualAmount || null
      };
    }

    return {
      props: {
        property: transformedProperty,
        isSold,
        taxData,
        historyData
      },
    };
  } catch (error) {
    console.error('API Error:', error);
    // Return mock data on API failure
    return {
      props: {
        property: {
          address: 'Property not found',
          price: 0,
          mediaUrls: ['/fallback-property.jpg'],
          // Add static agent info even for fallback
          agent: {
            name: 'John Easter',
            brokerage: 'Pennington Lines',
            photo: '/default-agent.jpg', 
            phone: '814-873-5810',
            email: 'easterjo106@yahoo.com'
          }
        },
        isSold: false,
        taxData: getMockTaxData(),
        historyData: getMockHistoryData()
      }
    };
  }
}

// helper to split comma/semicolon strings safely (accept array too)
function splitListSafe(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean).map(String);
  return String(raw).split(/[,;]+/).map(s => s.trim()).filter(Boolean);
}

export default function PropertyDetail({ property, isSold, taxData, historyData }) {
  // Handle error case
  if (!property || property.address === 'Property not found') {
    return (
      <>
        <Head>
          <title>Property Not Found | Erie Pennsylvania Real Estate</title>
        </Head>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Error loading property
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              There was an error loading this property. Please try again later.
            </p>
          </div>
        </div>
      </>
    );
  }

  // Route to appropriate component based on status
  const status = property.StandardStatus;
  if (status === 'Closed') {
    return (
      <>
        <Head>
          <title>{property.address || 'Property Details'} | Erie Pennsylvania Real Estate</title>
          <meta name="description" content={`View detailed information for ${property.address || 'this property'} including photos, features, and pricing.`} />
        </Head>
        <SoldProperty property={property} taxData={taxData} historyData={historyData} />
      </>
    );
  } else if (status === 'Pending' || status === 'ActiveUnderContract') {
    return (
      <>
        <Head>
          <title>{property.address || 'Property Details'} | Erie Pennsylvania Real Estate</title>
          <meta name="description" content={`View detailed information for ${property.address || 'this property'} including photos, features, and pricing.`} />
        </Head>
        <PendingProperty property={property} taxData={taxData} historyData={historyData} />
      </>
    );
  } else if (status === 'Active') {
    return (
      <>
        <Head>
          <title>{property.address || 'Property Details'} | Erie Pennsylvania Real Estate</title>
          <meta name="description" content={`View detailed information for ${property.address || 'this property'} including photos, features, and pricing.`} />
        </Head>
        <ActiveProperty property={property} taxData={taxData} historyData={historyData} />
      </>
    );
  }
  // Fallback (other statuses) use active template with tabs:
  return (
    <>
      <Head>
        <title>{property.address || 'Property Details'} | Erie Pennsylvania Real Estate</title>
        <meta name="description" content={`View detailed information for ${property.address || 'this property'} including photos, features, and pricing.`} />
      </Head>
      <ActiveProperty property={property} taxData={taxData} historyData={historyData} />
    </>
  );
}