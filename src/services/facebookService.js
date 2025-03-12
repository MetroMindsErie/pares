import axios from 'axios';
import supabase from '../lib/supabase-setup';

/**
 * Get Facebook token for user from auth_providers table (preferred) or users table
 */
export const getFacebookToken = async (userId) => {
  try {
    console.log('Getting Facebook token for user:', userId);
    
    // First try auth_providers table (preferred source)
    try {
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
    } catch (err) {
      console.warn('Error checking auth_providers table:', err);
    }

    // Fall back to users table
    console.log('Checking users table for Facebook token');
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('facebook_access_token, facebook_user_id')
        .eq('id', userId)
        .single();
      
      if (!userError && userData?.facebook_access_token) {
        console.log('Found Facebook token in users table');
        
        // Try to save to auth_providers for next time - ignore errors
        try {
          // Check if record already exists first to avoid conflicts
          const { data: existingData } = await supabase
            .from('auth_providers')
            .select('id')
            .eq('user_id', userId)
            .eq('provider', 'facebook')
            .maybeSingle();
            
          if (!existingData) {
            console.log('No existing auth_provider record, creating one');
            const { error: insertError } = await supabase
              .from('auth_providers')
              .insert({
                user_id: userId,
                provider: 'facebook',
                provider_user_id: userData.facebook_user_id || 'unknown',
                access_token: userData.facebook_access_token,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
              
            if (insertError) {
              console.warn('Could not create auth_provider record:', insertError);
            } else {
              console.log('Migrated Facebook token to auth_providers table');
            }
          } else {
            console.log('Auth provider record already exists, using update instead');
            await supabase
              .from('auth_providers')
              .update({
                access_token: userData.facebook_access_token,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingData.id);
          }
        } catch (migrateError) {
          console.warn('Could not migrate token to auth_providers:', migrateError);
        }
        
        return {
          accessToken: userData.facebook_access_token,
          providerId: userData.facebook_user_id
        };
      }
    } catch (userError) {
      console.warn('Error checking users table:', userError);
    }
    
    // Try to get from session as last resort
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.provider_token && session.user.app_metadata?.provider === 'facebook') {
        console.log('Found Facebook token in current session');
        
        // Save for future use
        const providerId = session.user.identities?.find(i => i.provider === 'facebook')?.id;
        
        if (providerId) {
          try {
            // Check if record already exists
            const { data: existingData } = await supabase
              .from('auth_providers')
              .select('id')
              .eq('user_id', userId)
              .eq('provider', 'facebook')
              .maybeSingle();
            
            if (!existingData) {
              const { error: insertError } = await supabase
                .rpc('insert_auth_provider', {
                  p_user_id: userId,
                  p_provider: 'facebook',
                  p_provider_user_id: providerId,
                  p_access_token: session.provider_token,
                  p_refresh_token: session.provider_refresh_token || null
                });
                
              if (insertError) {
                console.warn('Could not save token from session using RPC:', insertError);
              }
            }
            
            // Update user table in any case
            await supabase.from('users').update({
              facebook_access_token: session.provider_token,
              facebook_user_id: providerId,
              facebook_token_valid: true,
              facebook_token_updated_at: new Date().toISOString()
            }).eq('id', userId);
            
            console.log('Saved Facebook token from session');
          } catch (saveError) {
            console.warn('Could not save token from session:', saveError);
          }
        }
        
        return {
          accessToken: session.provider_token,
          providerId
        };
      }
    } catch (sessionError) {
      console.warn('Could not get token from session:', sessionError);
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
export const fetchUserReels = async (accessToken, providerId = 'me') => {
  try {
    console.log('Fetching reels with #realestate hashtag from Facebook...');
    
    // First search for posts with #realestate hashtag
    const hashtagResponse = await fetch(
      `https://graph.facebook.com/v18.0/${providerId}/posts?fields=id,message,attachments{media_type,url,description,media,target{id}},permalink_url,created_time&limit=100&access_token=${accessToken}`
    );
    
    const hashtagData = await hashtagResponse.json();
    const realEstateVideos = [];
    
    // Filter posts for real estate content
    if (hashtagData?.data?.length > 0) {
      console.log(`Found ${hashtagData.data.length} posts, searching for real estate content...`);
      
      for (const post of hashtagData.data) {
        const message = post.message?.toLowerCase() || '';
        const hasRealEstateHashtag = message.includes('#realestate') || 
                                    message.includes('real estate') ||
                                    message.includes('realtor');
        
        if (hasRealEstateHashtag && post.attachments?.data) {
          // Extract videos from post attachments
          const videoAttachments = post.attachments.data.filter(
            attachment => attachment.media_type === 'video'
          );
          
          for (const video of videoAttachments) {
            // Get video details if we have a target ID
            if (video.target?.id) {
              // Get full video details
              const videoDetailResponse = await fetch(
                `https://graph.facebook.com/v18.0/${video.target.id}?fields=id,description,source,thumbnails&access_token=${accessToken}`
              );
              
              const videoDetail = await videoDetailResponse.json();
              
              realEstateVideos.push({
                id: videoDetail.id,
                media_type: 'VIDEO',
                media_url: videoDetail.source || null,
                permalink: post.permalink_url,
                thumbnail_url: videoDetail.thumbnails?.data?.[0]?.uri || null,
                caption: videoDetail.description || post.message || '',
                timestamp: post.created_time
              });
            }
          }
        }
      }
      
      if (realEstateVideos.length > 0) {
        console.log(`Found ${realEstateVideos.length} real estate related videos`);
        return realEstateVideos;
      }
    }
    
    // Primary fallback: Fetch reels directly
    console.log('No real estate videos found in posts, trying reels endpoint...');
    const videosResponse = await fetch(
      `https://graph.facebook.com/v18.0/${providerId}/videos?fields=id,description,source,permalink_url,created_time,thumbnails&video_type=reels&limit=50&access_token=${accessToken}`
    );
    
    const data = await videosResponse.json();
    
    if (data?.data?.length > 0) {
      console.log(`Found ${data.data.length} reels using reels endpoint`);
      // Filter them for real estate content
      return data.data
        .filter(video => {
          const description = (video.description || '').toLowerCase();
          return description.includes('real estate') || 
                 description.includes('#realestate') || 
                 description.includes('#realtor');
        })
        .map(video => ({
          id: video.id,
          media_type: 'VIDEO',
          media_url: video.source || null,
          permalink: video.permalink_url,
          thumbnail_url: video.thumbnails?.data?.[0]?.uri || null,
          caption: video.description || '',
          timestamp: video.created_time
        }));
    }
    
    // Secondary fallback to general videos
    console.log('No reels found, trying fallback to general videos');
    const generalVideosResponse = await fetch(
      `https://graph.facebook.com/v18.0/${providerId}/videos?fields=id,description,source,permalink_url,created_time,thumbnails&video_type=all&limit=50&access_token=${accessToken}`
    );
    
    const generalData = await generalVideosResponse.json();
    
    if (generalData?.data?.length > 0) {
      console.log(`Found ${generalData.data.length} videos, filtering for real estate content`);
      return generalData.data
        .filter(video => {
          const description = (video.description || '').toLowerCase();
          return description.includes('real estate') || 
                 description.includes('#realestate') || 
                 description.includes('#realtor');
        })
        .map(video => ({
          id: video.id,
          media_type: 'VIDEO',
          media_url: video.source || null,
          permalink: video.permalink_url,
          thumbnail_url: video.thumbnails?.data?.[0]?.uri || null,
          caption: video.description || '',
          timestamp: video.created_time
        }));
    }
    
    console.log('No real estate videos found using any endpoint');
    return [];
  } catch (error) {
    console.error('Error fetching real estate reels from Facebook:', error.message);
    return [];
  }
};

/**
 * Filter reels for real estate relevance
 * @param {Array} reels - Reels to filter
 * @param {boolean} lessRestricted - Use a less restrictive filter
 */
export const filterRealEstateReels = (reels, lessRestricted = false) => {
  // Basic real estate keywords
  const REAL_ESTATE_KEYWORDS = [
    'realestate', 'property', 'home', 'house', 'apartment', 
    'condo', 'realtor', 'listing', 'forsale', 'realty',
    'mortgage', 'investment', 'luxuryhome', 'dreamhome',
    'housing', 'estate', 'sell', 'buy', 'rent', 'sale'
  ];
  
  // Extended keywords for less restricted filtering
  const EXTENDED_KEYWORDS = [
    ...REAL_ESTATE_KEYWORDS,
    'tour', 'open', 'view', 'move', 'agent', 'broker',
    'bedroom', 'bathroom', 'kitchen', 'living', 'dining',
    'pool', 'yard', 'garden', 'garage', 'closet', 'sqft',
    'square', 'foot', 'feet', 'acre', 'location', 'neighborhood',
    'community', 'school', 'park', 'beach', 'lake', 'river',
    'mountain', 'valley', 'hill', 'downtown', 'uptown', 'suburb'
  ];
  
  const keywords = lessRestricted ? EXTENDED_KEYWORDS : REAL_ESTATE_KEYWORDS;
  
  return reels.filter(reel => {
    // Accept videos with no caption in less restricted mode
    if (!reel.caption && lessRestricted) return true;
    if (!reel.caption) return false;
    
    const caption = reel.caption.toLowerCase();
    const hashtags = extractHashtags(caption);
    
    return keywords.some(keyword => 
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
 * @param {string} userId - User ID
 * @param {boolean} noFiltering - Skip real estate filtering if true
 */
export const processAndStoreReels = async (userId, noFiltering = false) => {
  try {
    console.log(`Processing reels for user ${userId}, noFiltering=${noFiltering}`);
    
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

    // Fetch reels from Facebook - pass providerId if available
    const reels = await fetchUserReels(tokenData.accessToken, tokenData.providerId || 'me');
    console.log(`Got ${reels.length} reels/videos from Facebook`);
    
    if (reels.length === 0) {
      return [];
    }
    
    let reelsToStore = reels;
    
    // Apply filtering if needed
    if (!noFiltering) {
      reelsToStore = filterRealEstateReels(reels, true);
      console.log(`Filtered to ${reelsToStore.length} real estate related reels`);
    }
    
    // Store in database
    if (reelsToStore.length > 0) {
      await storeReelsInDatabase(userId, reelsToStore);
      console.log(`Stored ${reelsToStore.length} reels in database`);
    }
    
    // Always return the processed reels
    return reelsToStore;
  } catch (error) {
    console.error('Error processing Facebook reels:', error);
    throw error;
  }
};

/**
 * Store reels in the database
 * @param {string} userId - User ID
 * @param {Array} reels - Reels to store
 */
const storeReelsInDatabase = async (userId, reels) => {
  if (!reels || reels.length === 0 || !userId) {
    console.warn('Invalid data provided to storeReelsInDatabase');
    return false;
  }
  
  try {
    console.log(`Storing ${reels.length} reels in database for user ${userId}`);
    
    // Prepare reels data with all needed fields
    const reelsToStore = reels.map(reel => ({
      user_id: userId,
      facebook_reel_id: reel.id,
      media_url: reel.media_url || reel.source || null,
      permalink: reel.permalink || null,
      thumbnail_url: reel.thumbnail_url || reel.picture || null,
      caption: reel.caption || reel.description || '',
      title: reel.title || '',
      created_at: new Date(reel.timestamp || reel.created_time || new Date()).toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    // Process the reels one by one to avoid batch issues
    const results = [];
    const errors = [];
    
    // Process reels in batches of 5 to avoid overwhelming the database
    const BATCH_SIZE = 5;
    const batches = [];
    
    for (let i = 0; i < reelsToStore.length; i += BATCH_SIZE) {
      batches.push(reelsToStore.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`Processing ${batches.length} batches of reels`);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Processing batch ${i+1} of ${batches.length}, with ${batch.length} reels`);
      
      try {
        // For each reel in the batch
        for (const reel of batch) {
          try {
            // Check if this reel already exists
            const { data: existingReel } = await supabase
              .from('reels')
              .select('id')
              .eq('user_id', reel.user_id)
              .eq('facebook_reel_id', reel.facebook_reel_id)
              .maybeSingle();
            
            let result;
            
            if (existingReel) {
              // Update existing reel
              console.log(`Updating existing reel: ${reel.facebook_reel_id}`);
              const { data, error } = await supabase
                .from('reels')
                .update({
                  media_url: reel.media_url,
                  permalink: reel.permalink,
                  thumbnail_url: reel.thumbnail_url,
                  caption: reel.caption,
                  title: reel.title,
                  updated_at: reel.updated_at
                })
                .eq('id', existingReel.id)
                .select();
                
              if (error) throw error;
              result = data;
            } else {
              // Insert new reel
              console.log(`Inserting new reel: ${reel.facebook_reel_id}`);
              const { data, error } = await supabase
                .from('reels')
                .insert(reel)
                .select();
                
              if (error) throw error;
              result = data;
            }
            
            results.push(result);
          } catch (error) {
            console.error(`Error processing reel ${reel.facebook_reel_id}:`, error);
            
            // Only add unique errors
            if (!errors.some(e => e.message === error.message)) {
              errors.push(error);
            }
            
            // Continue with next reel even if this one failed
            continue;
          }
        }
      } catch (batchError) {
        console.error(`Error processing batch ${i+1}:`, batchError);
        errors.push(batchError);
      }
      
      // Wait a bit between batches to avoid overwhelming the database
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    // Report on the results
    console.log(`Completed storing reels. Successful: ${results.length}, Failed: ${errors.length}`);
    
    if (errors.length > 0) {
      console.error(`${errors.length} errors while storing reels:`, errors[0]);
      throw errors[0];
    }
    
    return true;
  } catch (error) {
    console.error('Error storing reels in database:', error);
    throw error;
  }
};

/**
 * Check and adapt to the reels table structure
 */
const checkReelsTableStructure = async () => {
  try {
    // Get the first column of a reels record to check table structure
    const { data: columnInfo, error } = await supabase
      .rpc('get_table_columns', { tablename: 'reels' });
    
    if (error) {
      console.warn('Could not get reels table structure:', error);
      return;
    }
    
    if (columnInfo) {
      console.log('Reels table columns:', columnInfo.map(c => c.column_name).join(', '));
    }
  } catch (error) {
    console.warn('Error checking reels table structure:', error);
  }
};

/**
 * Get user's Facebook profile picture URL and save it to the database
 * @param {string} accessToken - Facebook access token
 * @param {string} fbUserId - Facebook user ID (defaults to 'me')
 * @param {string} [supabaseUserId] - Optional Supabase user ID to save picture to database
 * @returns {Promise<string|null>} - Profile picture URL or null
 */
export const getFacebookProfilePicture = async (accessToken, fbUserId = 'me', supabaseUserId = null) => {
  try {
    console.log(`Fetching Facebook profile picture for user ID: ${fbUserId}`);
    
    // Use proper error handling for API request
    let response;
    try {
      response = await axios.get(`https://graph.facebook.com/v18.0/${fbUserId}/picture`, {
        params: {
          access_token: accessToken,
          type: 'large',
          redirect: 'false'
        }
      });
    } catch (apiError) {
      console.error('Facebook picture API error:', apiError.message);
      
      // Try alternate endpoint format
      try {
        response = await axios.get('https://graph.facebook.com/me', {
          params: {
            access_token: accessToken,
            fields: 'picture.type(large)'
          }
        });
        
        // Extract URL from alternate response format
        if (response?.data?.picture?.data?.url) {
          const pictureUrl = response.data.picture.data.url;
          console.log('Got picture URL from alternate endpoint:', pictureUrl);
          
          // Save to database
          if (supabaseUserId) {
            await savePictureToDatabase(supabaseUserId, pictureUrl);
          }
          
          return pictureUrl;
        }
      } catch (altError) {
        console.error('Alternate picture fetch failed:', altError.message);
      }
      
      return null;
    }
    
    // Extract URL from response
    const pictureUrl = response.data?.data?.url;
    if (!pictureUrl) {
      console.warn('No picture URL in Facebook response');
      return null;
    }

    console.log('Got profile picture URL:', pictureUrl);
    
    // Always save to database if we have a user ID and picture URL
    if (supabaseUserId && pictureUrl) {
      await savePictureToDatabase(supabaseUserId, pictureUrl);
    }
    
    return pictureUrl;
  } catch (error) {
    console.error('Error in getFacebookProfilePicture:', error);
    return null;
  }
};

/**
 * Helper function to save picture URL to database
 */
async function savePictureToDatabase(userId, pictureUrl) {
  try {
    console.log(`Saving profile picture to database for user ${userId}`);
    
    // First try to update
    const { error } = await supabase
      .from('users')
      .update({ 
        profile_picture_url: pictureUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (error) {
      console.error('Error saving profile picture to database:', error);
      return false;
    }
    
    console.log('Successfully saved profile picture to database');
    return true;
  } catch (error) {
    console.error('Error in savePictureToDatabase:', error);
    return false;
  }
}

/**
 * Fix auth_providers table records for a user
 */
export const fixAuthProviderRecords = async (userId, provider = 'facebook') => {
  try {
    console.log(`Fixing auth_provider records for user ${userId} and provider ${provider}`);
    
    // First check if we have valid auth provider data
    const { data, error } = await supabase
      .from('auth_providers')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', provider);
    
    // Check if there are duplicate entries
    if (data && data.length > 1) {
      console.log('Found duplicate auth_provider entries, removing extras');
      
      // Keep only the latest one
      const sortedData = [...data].sort((a, b) => 
        new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at)
      );
      
      const latestRecord = sortedData[0];
      
      // Delete all except the latest
      for (const record of sortedData.slice(1)) {
        await supabase
          .from('auth_providers')
          .delete()
          .eq('id', record.id);
      }
      
      return { fixed: true, keptRecord: latestRecord };
    }
    
    // If no auth providers but user has Facebook token in users table, recreate it
    if ((!data || data.length === 0) && provider === 'facebook') {
      console.log('No auth_provider record found, checking users table');
      
      const { data: userData } = await supabase
        .from('users')
        .select('facebook_access_token, facebook_user_id')
        .eq('id', userId)
        .single();
      
      if (userData?.facebook_access_token && userData?.facebook_user_id) {
        console.log('Found Facebook token in users table, creating auth_provider record');
        
        const { error: insertError } = await supabase
          .from('auth_providers')
          .insert({
            user_id: userId,
            provider: 'facebook',
            provider_user_id: userData.facebook_user_id,
            access_token: userData.facebook_access_token,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
        if (insertError) {
          console.error('Error creating auth_provider record:', insertError);
          return { fixed: false, error: insertError };
        }
        
        return { fixed: true };
      }
    }
    
    return { fixed: false, noActionNeeded: true };
  } catch (error) {
    console.error('Error fixing auth_provider records:', error);
    return { fixed: false, error };
  }
};

/**
 * Check if a user has a valid Facebook connection
 * @param {string} userId - The Supabase user ID
 * @returns {Promise<boolean>} - Whether user has a Facebook connection
 */
export const checkFacebookConnection = async (userId) => {
  if (!userId) return false;
  
  try {
    console.log('Checking Facebook connection for user:', userId);
    
    // Method 1: Check auth_providers table
    const { data: providerData, error: providerError } = await supabase
      .from('auth_providers')
      .select('access_token')
      .eq('user_id', userId)
      .eq('provider', 'facebook')
      .single();
    
    if (!providerError && providerData?.access_token) {
      console.log('Found Facebook connection in auth_providers table');
      return true;
    }
    
    // Method 2: Check users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('facebook_access_token')
      .eq('id', userId)
      .single();
      
    if (!userError && userData?.facebook_access_token) {
      console.log('Found Facebook connection in users table');
      return true;
    }
    
    console.log('No Facebook connection found for user:', userId);
    return false;
  } catch (error) {
    console.error('Error checking Facebook connection:', error);
    return false;
  }
};

/**
 * Ensure a user record exists for the given user ID
 * This is critical for production where user records might not be created
 * automatically during OAuth flows
 */
export const ensureUserRecord = async (userId) => {
  if (!userId) return false;
  
  try {
    // Check if user record exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    
    // If user doesn't exist, create a minimal record
    if (checkError || !existingUser) {
      console.log('Creating initial user record for:', userId);
      
      const { error: createError } = await supabase
        .from('users')
        .insert({
          id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          hasprofile: false
        });
      
      if (createError) {
        console.error('Error creating user record:', createError);
        return false;
      }
      
      return true;
    }
    
    return true;
  } catch (error) {
    console.error('Error ensuring user record:', error);
    return false;
  }
};
