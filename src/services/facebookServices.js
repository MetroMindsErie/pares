import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service key for admin-level access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  process.env.NEXT_SUPABASE_SERVICE_KEY
);

// Keywords to filter real estate relevant content
const REAL_ESTATE_KEYWORDS = [
  'realestate', 'property', 'home', 'house', 'apartment', 
  'condo', 'realtor', 'listing', 'forsale', 'realty',
  'mortgage', 'investment', 'luxuryhome', 'dreamhome',
  // Add more variations to catch more content
  'housing', 'estate', 'sell', 'buy', 'rent', 'sale',
  'homebuying', 'homeselling', 'homesales', 'residential',
  'commercial', 'broker', 'agent', 'selling', 'buying'
];

/**
 * Get user's Facebook token from either auth_providers or users table
 */
export async function getFacebookToken(userId) {
  console.log(`Getting Facebook token for user ${userId}`);
  
  try {
    // First try the auth_providers table
    const { data, error } = await supabase
      .from('auth_providers')
      .select('access_token, provider_user_id')
      .eq('user_id', userId)
      .eq('provider', 'facebook');
    
    if (!error && data && data.length > 0) {
      console.log('Found token in auth_providers table');
      return {
        accessToken: data[0].access_token,
        providerId: data[0].provider_user_id
      };
    }

    // Fall back to the users table
    console.log('Checking users table for Facebook token...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('facebook_access_token, facebook_user_id')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error('Error fetching Facebook token from users table:', userError);
      return null;
    }
    
    if (!userData || !userData.facebook_access_token) {
      console.log(`No Facebook token found for user ${userId}`);
      return null;
    }
    
    return {
      accessToken: userData.facebook_access_token,
      providerId: userData.facebook_user_id
    };
  } catch (error) {
    console.error('Error in getFacebookToken:', error);
    return null;
  }
}

/**
 * Store Facebook token in auth_providers table with improved error handling
 */
export async function storeFacebookToken(userId, accessToken, providerId) {
  console.log(`Storing Facebook token for user ${userId}`);
  
  try {
    // Store in users table first (for backward compatibility)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        facebook_access_token: accessToken,
        facebook_user_id: providerId,
        facebook_token_updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    
    if (userError) {
      console.error('Error updating users table:', userError);
    } else {
      console.log('Successfully stored token in users table');
    }
    
    // Now handle auth_providers table - with DETAILED error logging
    console.log('Attempting to store token in auth_providers table...');
    
    // First check if record exists
    const { data: existingData, error: checkError } = await supabase
      .from('auth_providers')
      .select('id')
      .eq('user_id', userId)
      .eq('provider', 'facebook');
    
    if (checkError) {
      console.error('Error checking for existing auth provider:', checkError);
      // Continue to try insert/update anyway
    }
    
    let providerResult;
    
    if (existingData && existingData.length > 0) {
      // Update existing record
      console.log(`Updating existing auth_providers record with id: ${existingData[0].id}`);
      providerResult = await supabase
        .from('auth_providers')
        .update({
          access_token: accessToken,
          provider_user_id: providerId,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingData[0].id)
        .select();
    } else {
      // Insert new record
      console.log('Creating new auth_providers record');
      providerResult = await supabase
        .from('auth_providers')
        .insert([{
          user_id: userId,
          provider: 'facebook',
          provider_user_id: providerId,
          access_token: accessToken,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select();
    }
    
    if (providerResult.error) {
      console.error('Error storing token in auth_providers:', providerResult.error);
      throw new Error(`Failed to save Facebook token: ${providerResult.error.message}`);
    }
    
    console.log('Successfully stored token in auth_providers table:', providerResult.data);
    
    // Verify the token was actually saved
    const { data: verifyData, error: verifyError } = await supabase
      .from('auth_providers')
      .select('access_token')
      .eq('user_id', userId)
      .eq('provider', 'facebook');
    
    if (verifyError) {
      console.error('Error verifying token storage:', verifyError);
    } else if (!verifyData || verifyData.length === 0) {
      console.error('Token verification failed: No record found after save!');
      throw new Error('Token verification failed: No record found after save');
    } else {
      console.log('Token verified successfully in auth_providers table');
    }
    
    return true;
  } catch (error) {
    console.error('Error storing Facebook token:', error);
    throw error; // Bubble up the error to the caller
  }
}

/**
 * Get user data from Facebook using access token
 */
export async function getFacebookUserData(accessToken) {
  try {
    const response = await axios.get('https://graph.facebook.com/v18.0/me', {
      params: {
        fields: 'id,name,email',
        access_token: accessToken
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching Facebook user data:', error);
    throw new Error('Failed to fetch user data from Facebook');
  }
}

/**
 * Fetch user's reels from Facebook
 */
export async function fetchUserReels(accessToken) {
  try {
    // Using Facebook Graph API to get videos/reels
    const response = await axios.get('https://graph.facebook.com/v18.0/me/videos', {
      params: {
        fields: 'id,title,description,source,picture,created_time,permalink_url,comments.limit(0).summary(true),likes.limit(0).summary(true),tags',
        access_token: accessToken,
        limit: 50
      }
    });
    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching reels from Facebook:', error);
    throw new Error('Failed to fetch reels from Facebook');
  }
}

/**
 * Filter reels based on real estate relevance
 * Specifically checking for #realestate hashtag
 */
export function filterRealEstateReels(reels) {
  console.log(`Filtering ${reels.length} reels for real estate content`);
  
  return reels.filter(reel => {
    const description = (reel.description || '').toLowerCase();
    const title = (reel.title || '').toLowerCase();
    const tags = reel.tags ? reel.tags.map(tag => tag.name.toLowerCase()) : [];
    
    // First priority: Check for #realestate hashtag
    if (description.includes('#realestate') || extractHashtags(description).includes('realestate')) {
      console.log(`Found #realestate hashtag in reel: ${reel.id}`);
      return true;
    }
    
    // Second: Check other real estate keywords
    const isRealEstate = REAL_ESTATE_KEYWORDS.some(keyword => 
      description.includes(keyword) || 
      title.includes(keyword) ||
      tags.some(tag => tag.includes(keyword))
    );
    
    if (isRealEstate) {
      console.log(`Found real estate related content in reel: ${reel.id}`);
    }
    
    return isRealEstate;
  });
}

/**
 * Store filtered reels in database
 */
export async function storeReelsInDatabase(userId, reels) {
  try {
    const reelsToStore = reels.map(reel => ({
      facebook_reel_id: reel.id,
      user_id: userId,
      video_url: reel.source,
      thumbnail_url: reel.picture,
      title: reel.title || null,
      description: reel.description || null,
      hashtags: extractHashtags(reel.description),
      metadata: {
        created_time: reel.created_time,
        permalink_url: reel.permalink_url,
        likes_count: reel.likes?.summary?.total_count || 0,
        comments_count: reel.comments?.summary?.total_count || 0,
        tags: reel.tags || []
      },
      is_real_estate: true,
      cache_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    }));

    // Use upsert to update existing reels or insert new ones
    const { data, error } = await supabase
      .from('reels')
      .upsert(reelsToStore, { 
        onConflict: 'facebook_reel_id', 
        returning: 'minimal' 
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error storing reels in database:', error);
    throw new Error('Failed to store reels in database');
  }
}

/**
 * Extract hashtags from text
 */
function extractHashtags(text) {
  if (!text) return [];
  // Match hashtags pattern
  const hashtagRegex = /#(\w+)/g;
  const matches = text.match(hashtagRegex);
  
  if (matches) {
    return matches.map(tag => tag.substring(1).toLowerCase());
  }
  return [];
}

/**
 * Get cached reels for a user - fixed the cache expiry check
 */
export async function getCachedReels(userId) {
  try {
    const { data, error } = await supabase
      .from('reels')
      .select('*')
      .eq('user_id', userId)
      .eq('is_real_estate', true)
      .gt('cache_expires_at', new Date().toISOString()) // Fixed: check if cache hasn't expired
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching cached reels:', error);
    throw new Error('Failed to fetch cached reels');
  }
}

/**
 * Process and update reels for a user
 */
export async function processUserReels(userId) {
  console.log(`Processing reels for user ${userId}`);
  
  // Get the Facebook token from auth_providers or users table
  const tokenData = await getFacebookToken(userId);
  
  if (!tokenData) {
    throw new Error('No Facebook token available');
  }
  
  const accessToken = tokenData.accessToken;
  
  // Validate the token
  const tokenStatus = await validateFacebookToken(accessToken);
  if (!tokenStatus.valid) {
    console.error(`Invalid Facebook token for user ${userId}:`, tokenStatus.error);
    throw new Error(`Facebook token invalid: ${tokenStatus.error}`);
  }
  
  try {
    // Fetch reels from Facebook
    const reels = await fetchUserReels(accessToken);
    console.log(`Fetched ${reels.length} reels from Facebook`);
    
    // Filter for real estate related content
    const realEstateReels = filterRealEstateReels(reels);
    console.log(`Filtered to ${realEstateReels.length} real estate reels`);
    
    // Store filtered reels in database
    await storeReelsInDatabase(userId, realEstateReels);
    
    return realEstateReels;
  } catch (error) {
    console.error('Error processing user reels:', error);
    throw new Error('Failed to process user reels');
  }
}

// Function to validate a Facebook access token
export async function validateFacebookToken(accessToken) {
  try {
    console.log('Validating Facebook token...');
    
    // First check token debug info from Facebook
    const debugResponse = await axios.get('https://graph.facebook.com/debug_token', {
      params: {
        input_token: accessToken,
        access_token: accessToken // Using the same token, this works for validating own token
      }
    });
    
    if (!debugResponse.data?.data?.is_valid) {
      console.error('Token validation failed in debug_token:', debugResponse.data);
      return { 
        valid: false, 
        error: 'Token is invalid or expired',
        debug: debugResponse.data
      };
    }
    
    // Then try to use the token to access basic profile data
    const response = await axios.get('https://graph.facebook.com/me', {
      params: {
        access_token: accessToken,
        fields: 'id,name'
      }
    });
    
    console.log('Token validation successful, user:', response.data);
    
    return { 
      valid: true, 
      userId: response.data?.id,
      name: response.data?.name
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
}
