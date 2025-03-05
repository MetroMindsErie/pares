import React from 'react';
import { useRouter } from 'next/router';
import { ActiveProperty } from '../../components/ActiveProperty';
import { SoldProperty } from '../../components/SoldProperty';
import axios from 'axios';

export async function getServerSideProps({ params }) {
  try {
    const tokenResponse = await axios.post(
      'https://api-trestle.corelogic.com/trestle/oidc/connect/token',
      new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'api',
        client_id: process.env.TRESTLE_CLIENT_ID,
        client_secret: process.env.TRESTLE_CLIENT_SECRET,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
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
    console.log(propertyResponse.data.value[0]);
    const rawProperty = propertyResponse.data.value[0];
    const isSold = rawProperty.StandardStatus?.toLowerCase() === 'closed';

    const transformedProperty = {
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
      // ADDED FEATURES
      parkingFeatures: rawProperty.ParkingFeatures || 'Unknown',
      foundationDetails: rawProperty.FoundationDetails || 'Unknown',
      basement: rawProperty.Basement || 'Unknown',
      utilities: rawProperty.Utilities || 'Unknown',
      // END ADDED FEATURES
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

export default function PropertyDetail({ property, isSold }) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white text-black">
      <Navbar /> {/* Add Navbar here */}
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