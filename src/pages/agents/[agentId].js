// pages/agents/[agentId].js

import { createClient } from 'contentful';
import { documentToReactComponents } from '@contentful/rich-text-react-renderer';

export async function getServerSideProps({ params }) {
  const { agentId } = params;

  const client = createClient({
    space: process.env.CONTENTFUL_SPACE_ID,
    accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
  });

  try {
    // Fetch the individual agent by ID
    const res = await client.getEntry(agentId);

    if (!res) {
      return { notFound: true }; // Return 404 if agent is not found
    }

    const agent = {
      id: res.sys.id,
      name: res.fields.name,
      headshot: res.fields.headshot,
      biography:  res.fields.biography || null,
      contactEmail: res.fields.contactEmail || null,
      phoneNumber: res.fields.phoneNumber || null,
    };

    return { props: { agent } };
  } catch (error) {
    return { notFound: true }; // Return 404 if an error occurs
  }
}

const AgentPage = ({ agent }) => {
  if (!agent) {
    return <p>Agent not found.</p>;
  }

  return (
    <div>
      <h1>{agent.name}</h1>
      {agent.headshot && (
        <img
          src={agent.headshot.fields.file.url}
          alt={agent.headshot.fields.title}
          style={{ width: '200px', height: 'auto' }}
        />
      )}
      <div>
        <h3>Biography</h3>
        <p>{documentToReactComponents(agent.bio)}</p>
      </div>
      <div>
        <p>Email: {agent.contactEmail}</p>
        <p>Phone: {agent.phoneNumber}</p>
      </div>
    </div>
  );
};

export default AgentPage;
