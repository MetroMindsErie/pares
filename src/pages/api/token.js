import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Call your external token URL with required credentials.
    const response = await axios.post(process.env.NEXT_PUBLIC_TRESTLE_TOKEN_URL, {
      client_id: process.env.NEXT_PUBLIC_TRESTLE_CLIENT_ID,
      client_secret: process.env.NEXT_PUBLIC_TRESTLE_CLIENT_SECRET,
      grant_type: 'client_credentials',
      scope: 'api'
    });
    // Return the token from the external API.
    return res.status(200).json({ access_token: response.data.access_token });
  } catch (error) {
    console.error('Error fetching token:', error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      error: 'Failed to fetch token',
      details: error.response?.data || error.message
    });
  }
}