import { createClient } from 'contentful';
import { useRouter } from 'next/router';

const PropertyDetail = ({ property }) => {
  const router = useRouter();

  // Show a loading state when the page is being built or fetched
  if (router.isFallback) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '20px' }}>{property.fields.title}</h1>
      <p style={{ fontSize: '1.1rem', color: '#333' }}>
        <strong>Description:</strong> {property.fields.description}
      </p>
      <p><strong>Price:</strong> ${property.fields.price}</p>
      <p><strong>Location:</strong> {property.fields.location}</p>

      <div>
        {property.fields.images && property.fields.images.length > 0 ? (
          property.fields.images.map((image, index) => (
            <img
              key={index}
              src={`https:${image.fields.file.url}`}
              alt={image.fields.title}
              style={{
                width: '100%',
                maxHeight: '400px',
                objectFit: 'cover',
                marginBottom: '20px',
              }}
            />
          ))
        ) : (
          <p>No images available for this property</p>
        )}
      </div>
    </div>
  );
};

// This will run on the server side and fetch the property data from Contentful
export async function getServerSideProps({ params }) {
  const client = createClient({
    space: process.env.CONTENTFUL_SPACE_ID,
    accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
  });

  // Fetch the property by its sys.id
  const res = await client.getEntry(params.id);

  return {
    props: {
      property: res,
    },
  };
}

export default PropertyDetail;
