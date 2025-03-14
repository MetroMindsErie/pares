import React from 'react';
import { useRouter } from 'next/router';
import { ActiveProperty } from '../../components/ActiveProperty';
import { SoldProperty } from '../../components/SoldProperty';
import CryptoProperty from '../../components/Property/CryptoProperty';  // Import the CryptoProperty component
import { useAuth } from '../../context/auth-context';  // Import the auth context
import axios from 'axios';

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
    
    console.log(propertyResponse.data.value[0]);
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

    console.log('Property data ready:', {
      address: transformedProperty.address,
      UnparsedAddress: transformedProperty.UnparsedAddress,
      hasImages: transformedProperty.mediaUrls.length > 0,
      firstImage: transformedProperty.mediaUrls[0]
    });

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
  const { template } = router.query;
  const { user, getUserRole } = useAuth();
  
  // Log user role information for debugging
  console.log("PropertyDetail: auth user", user?.id);
  console.log("PropertyDetail: user roles", user?.roles);
  
  // Determine if user should see crypto template
  const shouldShowCryptoTemplate = () => {
    // First priority: URL parameter (for testing)
    if (template === 'crypto' || router.query.force === 'crypto') {
      console.log("Using crypto template based on URL parameter");
      return true;
    }
    
    // Check if user has crypto_investor role
    const hasCryptoRole = user?.roles?.includes('crypto_investor');
    if (hasCryptoRole) {
      console.log("Using crypto template based on user role");
      return true;
    }
    
    // Check localStorage (for persistence)
    if (typeof window !== 'undefined' && localStorage.getItem('cryptoInvestorSelected') === 'true') {
      console.log("Using crypto template based on localStorage flag");
      return true;
    }
    
    // Check getUserRole function
    if (getUserRole && getUserRole() === 'crypto_investor') {
      console.log("Using crypto template based on getUserRole function");
      localStorage.setItem('cryptoInvestorSelected', 'true');
      return true;
    }
    
    return false;
  };
  
  // Determine which template to show
  const useCryptoTemplate = shouldShowCryptoTemplate();
  
  // Debug output
  console.log("Final template decision:", useCryptoTemplate ? "CRYPTO" : "STANDARD");

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Template indicator for debugging */}
        <div className="mb-4 px-3 py-1 inline-block text-xs rounded-full" style={{ 
          backgroundColor: useCryptoTemplate ? '#10b981' : '#6366f1', 
          color: 'white' 
        }}>
          {useCryptoTemplate ? '🔐 Crypto View' : '👤 Standard View'}
        </div>
        
        {/* Choose the appropriate template based on both property status and user role */}
        {isSold ? (
          <SoldProperty property={property} />
        ) : useCryptoTemplate ? (
          <CryptoProperty propertyData={property} mlsData={property} />
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
        
        {/* Debugging buttons in development */}
        {process.env.NODE_ENV !== 'production' && (
          <div className="mt-4 p-4 border-t border-gray-200">
            <div className="flex gap-2 flex-wrap justify-center">
              <button 
                onClick={() => router.push(`${router.asPath.split('?')[0]}?template=standard`)}
                className="px-3 py-1 bg-blue-600 text-white text-xs rounded"
              >
                Force Standard View
              </button>
              <button 
                onClick={() => router.push(`${router.asPath.split('?')[0]}?template=crypto`)}
                className="px-3 py-1 bg-green-600 text-white text-xs rounded"
              >
                Force Crypto View
              </button>
              <button 
                onClick={() => {
                  localStorage.setItem('cryptoInvestorSelected', 'true');
                  router.reload();
                }}
                className="px-3 py-1 bg-purple-600 text-white text-xs rounded"
              >
                Set Crypto Flag
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}