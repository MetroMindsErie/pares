import axios from 'axios';
import { useRouter } from 'next/router'; // Add this line

const PropertyDetail = ({ property }) => {
    const router = useRouter();

    // Show a loading state if the page is being generated
    if (router.isFallback) {
        return <div>Loading...</div>;
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-4">{property.UnparsedAddress}</h1>
            <img
                src={property.media}
                alt={property.UnparsedAddress}
                className="w-full h-64 object-cover mb-4"
            />
            <p className="text-gray-700">
                <strong>Bedrooms:</strong> {property.BedroomsTotal}
            </p>
            <p className="text-gray-700">
                <strong>Bathrooms:</strong> {property.BathroomsTotalInteger}
            </p>
            <p className="text-gray-700">
                <strong>Status:</strong> {property.StandardStatus}
            </p>
            <p className="text-gray-700">
                <strong>Property Type:</strong> {property.PropertyType}
            </p>
            <button
                onClick={() => router.back()}
                className="mt-4 bg-blue-500 text-white py-2 px-4 rounded"
            >
                Go Back
            </button>
        </div>
    );
};

export async function getServerSideProps({ params }) {
  try {
    // Get access token
    const tokenResponse = await axios.post(
      'https://api-trestle.corelogic.com/trestle/oidc/connect/token',
      new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'api',
        client_id: process.env.TRESTLE_CLIENT_ID,
        client_secret: process.env.TRESTLE_CLIENT_SECRET
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    // Get property data
    const response = await axios.get(
      `https://api-trestle.corelogic.com/trestle/odata/Property?$filter=ListingKey eq '${params.id}'`,
      {
        headers: {
          Authorization: `Bearer ${tokenResponse.data.access_token}`,
          Accept: 'application/json'
        }
      }
    );

    if (!response.data.value?.length) {
      return { notFound: true };
    }

    return {
      props: {
        property: response.data.value[0]
      }
    };
  } catch (error) {
    console.error('API Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    return { notFound: true };
  }
}

export default PropertyDetail;