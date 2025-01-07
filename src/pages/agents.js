import { createClient } from 'contentful';
import { documentToReactComponents } from '@contentful/rich-text-react-renderer';

export async function getServerSideProps() {
  try {
    const client = createClient({
      space: process.env.CONTENTFUL_SPACE_ID,
      accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
    });

    const res = await client.getEntries({ content_type: 'agent' });
    const agents = res.items.map((item) => ({
      
      id: item.sys.id,
      ...item.fields,
    }));
    return { props: { agents } };
  } catch (error) {
    console.error('Error fetching agents:', error);
    return { props: { agents: [] } };
  }
}

const AgentsPage = ({ agents }) => {
  if (!agents || agents.length === 0) {
    return <p>No agents available.</p>;
  }

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '30px',
        padding: '40px 20px',
        backgroundColor: '#f4f4f4',
      }}
    >
      {agents.map(agent => (
        <div
          key={agent.id}
          style={{
            width: '250px',
            height: 'auto',
            padding: '20px',
            borderRadius: '15px',
            backgroundColor: '#fff',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
            transition: 'transform 0.2s ease-in-out',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <img
            src={`https:${agent.headshot.fields.file.url}`}
            alt={agent.headshot.fields.title}
            style={{
              width: '100px',
              height: '100px',
              objectFit: 'cover',
              borderRadius: '50%',
              margin: '0 auto',
              display: 'block',
              marginBottom: '15px',
            }}
          />
          <h2
            style={{
              fontSize: '1.3rem',
              fontWeight: '600',
              margin: '10px 0',
              color: '#333',
            }}
          >
            {agent.name}
          </h2>
          <p
            style={{
              fontSize: '0.9rem',
              color: '#555',
              margin: '5px 0',
            }}
          >
            <strong>Email:</strong> {agent.email}
          </p>
          <p
            style={{
              fontSize: '0.9rem',
              color: '#555',
              margin: '5px 0',
            }}
          >
            <strong>Phone:</strong> {agent.phoneNumber}
          </p>

          <div
            style={{
              marginTop: '20px',
              textAlign: 'left',
              fontSize: '0.9rem',
              color: '#444',
            }}
          >
            <h3
              style={{
                fontSize: '1.1rem',
                fontWeight: '500',
                color: '#333',
                marginBottom: '10px',
              }}
            >
              Biography:
            </h3>
            {/* Render the biography using the rich text renderer */}
            <div>{documentToReactComponents(agent.biography)}</div>

            <h3
              style={{
                fontSize: '1.1rem',
                fontWeight: '500',
                color: '#333',
                marginTop: '15px',
                marginBottom: '5px',
              }}
            >
              Properties Managed:
            </h3>
            <ul
              style={{
                paddingLeft: '20px',
                listStyleType: 'disc',
                fontSize: '0.9rem',
                color: '#444',
              }}
            >
              {agent.properties && agent.properties.length > 0 ? (
                // Extract the properties names from the references
                agent.properties.map((property, index) => (
                  <li key={index}>{property.fields.title}</li> // Assuming "title" is a field on the property entry
                ))
              ) : (
                <li>No properties listed</li>
              )}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AgentsPage;