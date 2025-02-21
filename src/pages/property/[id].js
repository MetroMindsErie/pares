// pages/property/[id].js (updated)
import React from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import PropertyHeader from '../../components/PropertyHeader';
import PropertyGallery from '../../components/PropertyGallery';
import PropertyDetails from '../../components/PropertyDetails';

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
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      ),
      axios.get(
        `https://api-trestle.corelogic.com/trestle/odata/Media?$filter=ResourceRecordKey eq '${params.id}'&$orderby=Order`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      )
    ]);

    if (!propertyResponse.data.value?.length) {
      return { notFound: true };
    }

    const property = {
      ...propertyResponse.data.value[0],
      media: mediaResponse.data.value.map(media => media.MediaURL)
    };

    return {
      props: {
        property,
        coordinates: property.Latitude && property.Longitude ? {
          lat: property.Latitude,
          lng: property.Longitude
        } : null
      },
    };
  } catch (error) {
    console.error('API Error:', error);
    return { notFound: true };
  }
}

const PropertyDetail = ({ property, coordinates }) => {
  const router = useRouter();
  const isClosed = property.StandardStatus?.toLowerCase() === 'closed';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
        <div>
          <PropertyHeader property={property} />
          <PropertyGallery media={property.media} />
          <PropertyDetails property={property} />
        </div>
        
        <div className="space-y-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-bold mb-4">Contact Agent</h3>
            <div className="space-y-4">
              <p className="text-gray-600">{property.ListAgentFullName}</p>
              <p className="text-gray-600">{property.ListOfficeName}</p>
              <p className="text-gray-600">{property.ListAgentPhone}</p>
              <button
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Request Info
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={() => {
            if (typeof window !== 'undefined' && window.history.length > 1) {
              router.back();
            } else {
              router.push("/");
            }
          }}
          className="bg-gray-100 text-gray-700 py-2 px-6 rounded-lg hover:bg-gray-200 transition-colors"
        >
          ← Back to Listings
        </button>
      </div>
    </div>
  );
};

export default PropertyDetail;