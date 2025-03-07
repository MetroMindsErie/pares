import axios from 'axios';
import supabase from '../lib/supabase-setup';

/**
 * Get Facebook token for user from auth_providers table (preferred) or users table
 */
export const getFacebookToken = async (userId) => {
  try {
    // First try auth_providers table (preferred source)
    const { data, error } = await supabase
      .from('auth_providers')
      .select('access_token, provider_user_id')
      .eq('user_id', userId)
      .eq('provider', 'facebook')
      .single();
    
    if (!error && data?.access_token) {
      console.log('Found Facebook token in auth_providers table');
      return {
        accessToken: data.access_token,
        providerId: data.provider_user_id
      };
    }

    // Fall back to users table
    console.log('Checking users table for Facebook token');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('facebook_access_token, facebook_user_id')
      .eq('id', userId)
      .single();
    
    if (!userError && userData?.facebook_access_token) {
      console.log('Found Facebook token in users table');
      return {
        accessToken: userData.facebook_access_token,
        providerId: userData.facebook_user_id
      };
    }
    
    console.log('No Facebook token found');
    return null;
  } catch (error) {
    console.error('Error in getFacebookToken:', error);
    return null;
  }
};

/**
 * Validate a Facebook access token
 */
export const validateFacebookToken = async (accessToken) => {
  try {
    console.log('Validating Facebook token...');
    
    // First try a simple me request as it's more reliable
    try {
      const meResponse = await axios.get('https://graph.facebook.com/me', {
        params: {
          access_token: accessToken,
          fields: 'id,name'
        }
      });
      
      if (meResponse.data?.id) {
        console.log('Token validated successfully via /me endpoint:', meResponse.data.id);
        return { 
          valid: true, 
          userId: meResponse.data.id,
          name: meResponse.data.name
        };
      }
    } catch (meError) {
      console.warn('Failed to validate via /me endpoint:', meError.message);
    }
    
    // Fall back to debug_token if /me fails
    const debugResponse = await axios.get('https://graph.facebook.com/debug_token', {
      params: {
        input_token: accessToken,
        access_token: accessToken 
      }
    });
    
    if (!debugResponse.data?.data?.is_valid) {
      console.error('Token validation failed in debug_token:', debugResponse.data);
      return { 
        valid: false, 
        error: 'Token is invalid or expired'
      };
    }
    
    return { 
      valid: true, 
      userId: debugResponse.data?.data?.user_id,
    };
  } catch (error) {
    console.error('Facebook token validation error:', error.response?.data || error.message);
    const errorMsg = error.response?.data?.error?.message || 
                   error.response?.data?.error_description || 
                   error.message || 
                   'Unknown token validation error';
                   
    return { 
      valid: false, 
      error: errorMsg
    };
  }
};

/**
 * Fetch user's reels from Facebook
 */
export const fetchUserReels = async (accessToken) => {
  try {
    const response = await axios.get('https://graph.facebook.com/v18.0/me', {
      params: {
        fields: 'name,id,media{media_type,media_url,permalink,thumbnail_url,caption,timestamp}',
        access_token: accessToken
      }
    });
    
    if (!response.data?.media?.data) {
      return [];
    }
    
    // Filter for video content only
    return response.data.media.data.filter(item => 
      item.media_type === 'VIDEO' || 
      item.media_type === 'REEL'
    );
  } catch (error) {
    console.error('Error fetching reels from Facebook:', error);
    throw new Error('Failed to fetch reels from Facebook');
  }
};

/**
 * Filter reels for real estate relevance
 */
export const filterRealEstateReels = (reels) => {
  const REAL_ESTATE_KEYWORDS = [
    'realestate', 'property', 'home', 'house', 'apartment', 
    'condo', 'realtor', 'listing', 'forsale', 'realty',
    'mortgage', 'investment', 'luxuryhome', 'dreamhome',
    'housing', 'estate', 'sell', 'buy', 'rent', 'sale'
  ];
  
  return reels.filter(reel => {
    if (!reel.caption) return false;
    
    const caption = reel.caption.toLowerCase();
    const hashtags = extractHashtags(caption);
    
    return REAL_ESTATE_KEYWORDS.some(keyword => 
      caption.includes(keyword) || 
      hashtags.some(tag => tag.includes(keyword))
    );
  });
};

/**
 * Extract hashtags from text
 */
const extractHashtags = (text) => {
  if (!text) return [];
  const hashtagRegex = /#(\w+)/g;
  const matches = text.match(hashtagRegex);
  return matches ? matches.map(tag => tag.slice(1).toLowerCase()) : [];
};

/**
 * Process and store user's Facebook reels in the database
 */
export const processAndStoreReels = async (userId) => {
  try {
    // Get Facebook token
    const tokenData = await getFacebookToken(userId);
    if (!tokenData) {
      throw new Error('No Facebook token available');
    }
    
    // Validate token
    const tokenStatus = await validateFacebookToken(tokenData.accessToken);
    if (!tokenStatus.valid) {
      throw new Error(`Facebook token invalid: ${tokenStatus.error}`);
    }
    
    // Fetch reels from Facebook
    const reels = await fetchUserReels(tokenData.accessToken);
    
    // Filter for real estate content
    const realEstateReels = filterRealEstateReels(reels);
    
    // Store in database
    if (realEstateReels.length > 0) {
      await storeReelsInDatabase(userId, realEstateReels);
    }
    
    return realEstateReels;
  } catch (error) {
    console.error('Error processing Facebook reels:', error);
    throw error;
  }
};

/**
 * Store filtered reels in the database
 */
const storeReelsInDatabase = async (userId, reels) => {
  try {
    const reelsToStore = reels.map(reel => ({
      user_id: userId,
      facebook_reel_id: reel.id,
      media_url: reel.media_url,
      permalink: reel.permalink,
      thumbnail_url: reel.thumbnail_url,
      caption: reel.caption || '',
      created_at: new Date(reel.timestamp).toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    const { error } = await supabase
      .from('reels')
      .upsert(reelsToStore, { 
        onConflict: 'facebook_reel_id', 
        returning: 'minimal' 
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error storing reels in database:', error);
    throw error;
  }
};

/**
 * Get user's Facebook profile picture URL
 */
export const getFacebookProfilePicture = async (accessToken, fbUserId = 'me') => {
  try {
    const response = await axios.get(`https://graph.facebook.com/v18.0/${fbUserId}/picture`, {
      params: {
        access_token: accessToken,
        type: 'large',
        redirect: 'false'
      }
    });
    
    if (response.data?.data?.url) {
      return response.data.data.url;
    }
    return null;
  } catch (error) {
    console.error('Error fetching Facebook profile picture:', error);
    return null;
  }
};
