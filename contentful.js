import { createClient } from 'contentful';

const client = createClient({
  space: process.env.CONTENTFUL_SPACE_ID,
  accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
});

// Function to fetch entries, optionally filtering by content type
export const fetchEntries = async (contentType = '') => {
  try {
    const query = contentType
      ? { content_type: contentType }  // Only filter by content_type if one is provided
      : {};  // Fetch all entries if no contentType is specified

    const entries = await client.getEntries(query);

    if (entries.items) return entries.items;
    return [];
  } catch (error) {
    console.error('Error fetching entries:', error);
    return [];
  }
};

export default client;
