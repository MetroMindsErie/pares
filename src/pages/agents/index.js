// pages/agents/index.js

import { createClient } from 'contentful';

export async function getServerSideProps() {
  const client = createClient({
    space: process.env.CONTENTFUL_SPACE_ID,
    accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
  });

  // Fetch all agents
  const res = await client.getEntries({
    content_type: 'agent', // Ensure this matches the Contentful content type for agents
  });

  const agents = res.items.map((item) => ({
    id: item.sys.id,
    name: item.fields.name,
    headshot: item.fields.headshot,
  }));

  return { props: { agents } };
}

const AgentsPage = ({ agents }) => {
  return (
    <div>
      <h1>Our Agents</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {agents.length > 0 ? (
          agents.map((agent) => (
            <div key={agent.id} style={{ margin: '20px', maxWidth: '250px' }}>
              {agent.headshot && (
                <img
                  src={agent.headshot.fields.file.url}
                  alt={agent.headshot.fields.title}
                  style={{ width: '100%', height: 'auto' }}
                />
              )}
              <h3>{agent.name}</h3>
              <p>
                <a href={`/agents/${agent.id}`}>View Details</a>
              </p>
            </div>
          ))
        ) : (
          <p>No agents available.</p>
        )}
      </div>
    </div>
  );
};

export default AgentsPage;
