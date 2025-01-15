// pages/api/token.js
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    // Get the client credentials from environment variables or the request body
    const { client_id, client_secret } = req.body;

    try {
      // Make a request to the Trestle API to get the token
      const response = await axios.post(
        'https://api-trestle.corelogic.com/trestle/oidc/connect/token',
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id,
          client_secret,
          scope: 'api',
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      // Return the access token to the frontend
      res.status(200).json({ access_token: response.data.access_token });
    } catch (error) {
      // Handle error and send it back to the frontend
      console.error('Error getting token:', error);
      res.status(500).json({ error: 'Failed to fetch token' });
    }
  } else {
    // Only allow POST requests
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
