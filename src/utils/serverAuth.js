import axios from 'axios';
import querystring from 'querystring';

/**
 * Verify the Trestle API credentials and get a token directly on the server
 * Used for server-side rendering and API routes
 */
export const getServerSideToken = async () => {
  try {
    // Environment variables are accessible server-side
    const tokenUrl = process.env.NEXT_PUBLIC_TRESTLE_TOKEN_URL;
    const clientId = process.env.NEXT_PUBLIC_TRESTLE_CLIENT_ID;
    const clientSecret = process.env.NEXT_PUBLIC_TRESTLE_CLIENT_SECRET;
    
    // Verify required credentials
    if (!tokenUrl || !clientId || !clientSecret) {
      console.error('Missing Trestle API credentials');
      throw new Error('Trestle API credentials not configured');
    }
    
    // Make direct request to token endpoint
    const response = await axios({
      method: 'post',
      url: tokenUrl,
      data: querystring.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
        scope: 'api'
      }),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      }
    });
    
    if (!response.data || !response.data.access_token) {
      throw new Error('Invalid token response');
    }
    
    // Return the access token and expiry
    return {
      accessToken: response.data.access_token,
      expiresIn: response.data.expires_in || 3600
    };
  } catch (error) {
    console.error('Server-side token error:', error.message);
    console.error('Response:', error.response?.data);
    throw new Error(`Server-side authentication failed: ${error.message}`);
  }
};
