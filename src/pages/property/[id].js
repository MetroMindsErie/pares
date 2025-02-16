// /pages/property/[id].js
import React from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import ActiveProperty from '../../components/ActiveProperty';
import SoldProperty from '../../components/SoldProperty';

export async function getServerSideProps({ params }) {
  try {
    // 1. Get an access token from Trestle
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

    // 2. Fetch the property details using the ListingKey (from params.id)
    const propertyResponse = await axios.get(
      `https://api-trestle.corelogic.com/trestle/odata/Property?$filter=ListingKey eq '${params.id}'`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      }
    );

    if (!propertyResponse.data.value || propertyResponse.data.value.length === 0) {
      return { notFound: true };
    }
    const property = propertyResponse.data.value[0];

    // 3. Fetch media URLs for this property
    const mediaResponse = await axios.get(
      `https://api-trestle.corelogic.com/trestle/odata/Media?$filter=ResourceRecordKey eq '${property.ListingKey}'&$orderby=Order`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      }
    );

    // Map the returned media to get the MediaURL values
    const mediaUrls = mediaResponse.data.value.map((media) => media.MediaURL);

    // 4. Create a new property object with a single media URL (or fallback)
    const propertyWithMedia = {
      ...property,
      media: mediaUrls[0] || '/fallback-property-image.jpg',
    };

    return {
      props: {
        property: propertyWithMedia,
      },
    };
  } catch (error) {
    console.error('API Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    return { notFound: true };
  }
}

const PropertyDetail = ({ property }) => {
  const router = useRouter();

  if (router.isFallback) {
    return <div>Loading...</div>;
  }

  // Determine which template to use based on property status.
  // Adjust this logic if your API uses a different value.
  const isSold =
    property.StandardStatus &&
    property.StandardStatus.toLowerCase() === 'sold';

  return (
    <div>
      {isSold ? (
        <SoldProperty data={property} />
      ) : (
        <ActiveProperty data={property} />
      )}

      <div className="flex justify-center mt-4">
        <button
          onClick={() => router.back()}
          className="bg-blue-500 text-white py-2 px-4 rounded"
        >
          Go Back
        </button>
      </div>
    </div>
  );
};

export default PropertyDetail;
