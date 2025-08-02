import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { SoldProperty } from '../../components/SoldProperty';
import PropertyView from '../../components/Property/PropertyView';
import axios from 'axios';

// Mock tax data as fallback
// const getMockTaxData = () => ({
//   ownerInformation: {
//     ownerName: "Property Owner",
//     mailingAddress: "123 Main St",
//     taxBillingCity: "Erie PA",
//     taxBillingZip: "16508",
//     taxBillingZipPlus4: "1557",
//     ownerOccupied: "O"
//   },
//   locationInformation: {
//     schoolDistrict: "City Of Erie School",
//     censusTrack: "002200",
//     carrierRoute: "C014",
//     subdivision: "Sample Add",
//     zoning: "1661",
//     mapPageGrid: "19-6219",
//     topography: "FLAT/LEVEL"
//   },
//   estimatedValue: {
//     realAVM: "$134,500",
//     realAVMRangeHigh: "$167,900",
//     realAVMRangeLow: "$101,200",
//     valueAsOf: "07/14/2025",
//     confidenceScore: "49",
//     forecastStandardDeviation: "25"
//   },
//   taxInformation: {
//     taxId: "19-062-019.0-108.00",
//     percentImproved: "77",
//     taxArea: "19",
//     lotNumber: "10800",
//     legalDescription: "Sample Legal Description",
//     townshipTax: "$1,016.80",
//     countyTax: "$512.28",
//     schoolTax: "$1,535.16",
//     taxYear: "2025"
//   },
//   assessmentAndTaxes: {
//     assessmentYears: ["2025", "2024", "2023"],
//     assessedValueTotal: ["$77,500", "$77,500", "$77,500"],
//     assessedValueLand: ["$18,100", "$18,100", "$18,100"],
//     assessedValueImproved: ["$59,400", "$59,400", "$59,400"],
//     yoyAssessedChange: ["$", "$", "$"],
//     yoyAssessedChangePercent: ["0%", "0%", "0%"],
//     marketValueTotal: ["$77,500", "$77,500", "$77,500"],
//     marketValueLand: ["$18,100", "$18,100", "$18,100"],
//     marketValueImproved: ["$59,400", "$59,400", "$59,400"]
//   }
// });

// // Mock history data as fallback
// const getMockHistoryData = () => ({
//   listingHistory: [
//     {
//       dom: "4",
//       changeType: "New Listing",
//       price: "$170,000",
//       changeDetails: "->ACT",
//       whenChanged: "07/25/25 @ 12:34 PM",
//       effDate: "07/25/25",
//       modBy: "CUMMINGS100",
//       propType: "RES",
//       address: "1119 W 31ST Street",
//       listingId: "187084",
//       imageUrl: "/fallback-property.jpg"
//     }
//   ],
//   saleHistory: [
//     {
//       recDate: "04/27/98",
//       saleDate: "04/27/98",
//       salePrice: "$63,500",
//       nomBuyerNames: "Sullivan Christine E",
//       sellerNames: "Monahan Kevin M & Amy R",
//       titleCompany: "",
//       docNumber: "556-1955",
//       documentType: "Warranty Deed"
//     },
//     {
//       recDate: "05/22/97",
//       saleDate: "05/22/97",
//       salePrice: "$63,800",
//       nomBuyerNames: "Brock Amy R",
//       sellerNames: "Gaidula James",
//       titleCompany: "",
//       docNumber: "499-1480",
//       documentType: "Warranty Deed"
//     }
//   ],
//   mortgageHistory: [
//     {
//       date: "05/22/1997",
//       amount: "$51,000",
//       mortgageLender: "Northwest Svgs Bk",
//       mortgageType: "CONVENTIONAL",
//       mortgageTypeCode: "",
//       term: "",
//       intRate: "",
//       titleCompany: ""
//     }
//   ]
// });

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
    const historicalSaleFields = [
      'PreviousSalePrice', 'PreviousSaleDate', 'PreviousBuyerName', 'PreviousSellerName',
      'LastSalePrice', 'LastSaleDate', 'LastBuyerName', 'LastSellerName'
    ];

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
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
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
      </div>
    </div>
  );
};

export async function getServerSideProps({ params }) {
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
        name: rawProperty.ListAgentFullName || 'Unknown Agent',
        brokerage: rawProperty.ListOfficeName || 'Unknown Brokerage',
        photo: rawProperty.ListAgentPhotoURL || '/default-agent.jpg',
        phone: rawProperty.ListAgentPhone || 'Phone not available',
        email: rawProperty.ListAgentEmail || 'Email not available'
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
        buyerAgent: rawProperty.BuyerAgentFullName || 'Unknown Buyer Agent'
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
          mediaUrls: ['/fallback-property.jpg']
        },
        isSold: false,
        taxData: getMockTaxData(),
        historyData: getMockHistoryData()
      }
    };
  }
}

export default function PropertyDetail({ property, isSold, taxData, historyData }) {
  const router = useRouter();

  return (
    <>
      <PropertyDetailWithTabs property={property} isSold={isSold} taxData={taxData} historyData={historyData} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="text-center">
          <button
            onClick={() => router.back()}
            className="bg-gray-100 text-black py-2 px-6 rounded-lg border border-black hover:bg-gray-200 transition-colors"
          >
            ← Back to Listings
          </button>
        </div>
      </div>
    </>
  );
}