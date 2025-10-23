import axios from 'axios';

/**
 * Validates the Trestle API token URL format
 */
export const validateTokenUrl = (url) => {
  if (!url) {
    return {
      valid: false,
      error: 'Token URL is missing'
    };
  }
  
  try {
    const urlObj = new URL(url);
    
    // Check if it's using HTTPS (recommended for authentication endpoints)
    if (urlObj.protocol !== 'https:') {
      return {
        valid: false,
        error: 'Token URL should use HTTPS protocol',
        url
      };
    }
    
    // Check if it has a hostname
    if (!urlObj.hostname) {
      return {
        valid: false,
        error: 'Token URL is missing hostname',
        url
      };
    }
    
    // Check if it includes a path for token endpoint
    if (!urlObj.pathname || urlObj.pathname === '/') {
      return {
        valid: false,
        error: 'Token URL should include a path to the token endpoint',
        url
      };
    }
    
    return {
      valid: true,
      url
    };
  } catch (error) {
    return {
      valid: false,
      error: `Invalid URL format: ${error.message}`,
      url
    };
  }
};

/**
 * Tests the Trestle API token endpoint
 */
export const testTokenEndpoint = async () => {
  try {
    const tokenUrl = process.env.NEXT_PUBLIC_TRESTLE_TOKEN_URL;
    const clientId = process.env.TRESTLE_CLIENT_ID;
    const clientSecret = process.env.TRESTLE_CLIENT_SECRET;
    
    // Validate URL format first
    const urlValidation = validateTokenUrl(tokenUrl);
    if (!urlValidation.valid) {
      return {
        success: false,
        error: urlValidation.error
      };
    }
    
    if (!clientId || !clientSecret) {
      return {
        success: false,
        error: 'Client ID or Client Secret is missing'
      };
    }
    
    // Make a HEAD request first to check if the endpoint exists
    // without actually trying to authenticate
    try {
      await axios.head(tokenUrl);
    } catch (headError) {
      // Even a 401/403 error means the endpoint exists
      if (headError.response && headError.response.status !== 404 && headError.response.status !== 502) {
        // Endpoint exists but requires authentication, which is expected

      } else {
        // 404 or 502 means the endpoint doesn't exist or is not reachable
        return {
          success: false,
          error: `Token endpoint not found or not accessible: ${headError.message}`,
          status: headError.response?.status
        };
      }
    }
    
    // Now try an actual authentication request
    const authResponse = await axios.post(tokenUrl, {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
      scope: 'api'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (authResponse.data && authResponse.data.access_token) {
      return {
        success: true,
        message: 'Successfully authenticated with Trestle API'
      };
    } else {
      return {
        success: false,
        error: 'Authentication succeeded but no access token received'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `Authentication test failed: ${error.message}`,
      details: error.response?.data || {}
    };
  }
};

export default {
  validateTokenUrl,
  testTokenEndpoint
};
