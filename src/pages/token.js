// pages/api/token.js
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    // Get the client credentials from environment variables or the request body
    const client_id = process.env.NEXT_PUBLIC_TRESTLE_CLIENT_ID;
    const client_secret = process.env.NEXT_PUBLIC_TRESTLE_CLIENT_SECRET;

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
      res.setHeader('Cache-Control', 'private, max-age=3500'); // Cache for just under 1 hour
      return res.status(200).json({
        access_token: tokenResponse.data.access_token,
        expires_in: tokenResponse.data.expires_in,
        timestamp: Date.now()
      });    } catch (error) {
      // Handle error and send it back to the frontend
      console.error('Error getting token:', error);
      console.error('Error details:', error.response ? error.response.data : error.message);
      res.status(500).json({ error: 'Failed to fetch token' });
    }
  } else {
    // Only allow POST requests
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
