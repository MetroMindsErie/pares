import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    console.log('Trestle token request started');
    
    // Format data as x-www-form-urlencoded (required for OAuth2)
    const formData = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.NEXT_PUBLIC_TRESTLE_CLIENT_ID,
      client_secret: process.env.NEXT_PUBLIC_TRESTLE_CLIENT_SECRET,
      scope: 'api'
    });
    
    console.log('Using client ID:', process.env.NEXT_PUBLIC_TRESTLE_CLIENT_ID?.substring(0, 5) + '...');
    
    // Call your external token URL with required credentials using proper format
    const response = await axios.post(
      "https://api-trestle.corelogic.com/trestle/oidc/connect/token", 
      formData.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    console.log('Token request successful');
    
    // Return the token from the external API
    return res.status(200).json({ 
      access_token: response.data.access_token,
      expires_in: response.data.expires_in || 3600
    });
  } catch (error) {
    console.error('Error fetching token:', error.response?.data || error.message);
    console.error('Error status:', error.response?.status);
    console.error('Error headers:', error.response?.headers);
    
    if (error.response?.data?.error_description) {
      console.error('API error description:', error.response.data.error_description);
    }
    
    return res.status(error.response?.status || 500).json({
      error: 'Failed to fetch token',
      details: error.response?.data || error.message
    });
  }
}