import React from 'react';
import { useRouter } from 'next/router';
import { ActiveProperty } from '../../components/ActiveProperty';
import { SoldProperty } from '../../components/SoldProperty';
import Layout from '../../components/Layout';
import axios from 'axios';

// Define the component first to ensure it's recognized as a React component
function PropertyDetail({ property, isSold }) {
  const router = useRouter();

  // Handle the case where the page is still being generated
  if (router.isFallback) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isSold ? (
          <SoldProperty property={property} />
        ) : (
          <ActiveProperty property={property} />
        )}

        <div className="mt-8 text-center">
          <button
            onClick={() => router.back()}
            className="bg-gray-100 text-black py-2 px-6 rounded-lg border border-black hover:bg-gray-200 transition-colors"
          >
            ← Back to Listings
          </button>
        </div>
      </div>
    </div>
  );
}

// Data fetching function
export async function getServerSideProps({ params }) {
  try {
    // Use our token API endpoint instead of directly calling Trestle
    const tokenResponse = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL || ''}/api/token`
    );
    
    const token = tokenResponse.data.access_token;

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

    // Transform property data
    const transformedProperty = {
      // ...existing code...
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
      images: (mediaResponse?.data?.value || [])
        .map(media => media.MediaURL)
        .filter(url => url && url.startsWith('http')),
      ...(isSold && {
        soldPrice: rawProperty.ClosePrice || 0,
        soldDate: rawProperty.CloseDate ?
          new Date(rawProperty.CloseDate).toLocaleDateString() :
          'Date not available',
        buyerAgent: rawProperty.BuyerAgentFullName || 'Unknown Buyer Agent'
      })
    };

    return {
      props: {
        property: transformedProperty,
        isSold
      },
    };
  } catch (error) {
    console.error('API Error:', error);
    return { notFound: true };
  }
}

// Make sure to export the component properly
export default PropertyDetail;