import axios from 'axios';
import supabase from '../../../../lib/supabase-setup';
import { getAuthHeaders } from '../../../../lib/api-helpers';

/**
 * Get Facebook token for user from auth_providers table (preferred) or users table
 */
export const getFacebookToken = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required to get Facebook token');
    }

    // Check auth_providers table first
    const { data: providerData, error: providerError } = await supabase
      .from('auth_providers')
      .select('access_token')
      .eq('user_id', userId)
      .eq('provider', 'facebook')
      .single();

    if (providerData?.access_token) {
      return { accessToken: providerData.access_token };
    }

    // Fallback: check users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('facebook_access_token')
      .eq('id', userId)
      .single();

    if (userData?.facebook_access_token) {
      return { accessToken: userData.facebook_access_token };
    }

    throw new Error('Facebook token not found');
  } catch (error) {
    console.error('Error getting Facebook token:', error);
    throw error;
  }
};

/**
 * Validate a Facebook access token
 */
export const validateFacebookToken = async (accessToken) => {
  try {

    
    // First try a simple me request as it's more reliable
    try {
      const meResponse = await axios.get('https://graph.facebook.com/me', {
        params: {
          access_token: accessToken,
          fields: 'id,name'
        }
      });
      
      if (meResponse.data?.id) {

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
 * Check if user has required permissions and provide guidance for missing ones
 */
export const checkRequiredPermissions = async (accessToken) => {
  try {

    const permissionsResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/permissions?access_token=${accessToken}`
    );
    
    const permissionsData = await permissionsResponse.json();
    
    if (permissionsData.error) {
      console.error('Error checking permissions:', permissionsData.error);
      return { 
        hasRequired: false, 
        missingPermissions: ['user_videos', 'user_posts'],
        permissionsData: null
      };
    }
    
    const permissions = permissionsData.data || [];

    
    // Check for critical permissions
    const hasUserVideos = permissions.some(p => p.permission === 'user_videos' && p.status === 'granted');
    const hasUserPosts = permissions.some(p => p.permission === 'user_posts' && p.status === 'granted');
    
    const missingPermissions = [];
    if (!hasUserVideos) missingPermissions.push('user_videos');
    if (!hasUserPosts) missingPermissions.push('user_posts');
    
    return {
      hasRequired: hasUserVideos || hasUserPosts,
      hasUserVideos,
      hasUserPosts,
      missingPermissions,
      permissionsData: permissions
    };
  } catch (error) {
    console.error('Error checking permissions:', error);
    return { 
      hasRequired: false, 
      missingPermissions: ['user_videos', 'user_posts'],
      error
    };
  }
};

/**
 * Generate a permission request URL for Facebook
 */
export const getPermissionRequestUrl = (appId, redirectUri) => {
  // Base URL for Facebook OAuth
  const baseUrl = 'https://www.facebook.com/v18.0/dialog/oauth';
  
  // Required permissions for video access
  const scope = 'email,public_profile,user_videos,user_posts';
  
  // Additional parameters for best experience
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope,
    response_type: 'token',
    auth_type: 'rerequest' // Force permission dialog to show
  });
  
  return `${baseUrl}?${params.toString()}`;
};

/**
 * Fetch user's reels from Facebook
 */
export const fetchUserReels = async (accessToken, providerId = 'me') => {
  try {

    
    // First check if the token is valid and has proper permissions
    const permissionCheck = await checkRequiredPermissions(accessToken);
    
    // If missing permissions, provide guidance
    if (!permissionCheck.hasRequired) {
      console.warn('⚠️ PERMISSION ISSUE: Missing required Facebook permissions to access videos');
      console.warn('Required permissions: user_videos or user_posts');
      console.warn('Currently granted permissions:', permissionCheck.permissionsData?.map(p => p.permission).join(', ') || 'none');
      
      // Return the permission issue as part of the result so UI can show appropriate messaging
      return {
        permissionIssue: true,
        videos: [],
        missingPermissions: permissionCheck.missingPermissions
      };
    }
    

    
    // Try multiple approaches to find reels
    let allVideos = [];
    
    // APPROACH 1: Search for posts with #realestate hashtag (original approach)
    // Only try this if we have user_posts permission
    if (permissionCheck.hasUserPosts) {

      try {
        const hashtagResponse = await fetch(
          `https://graph.facebook.com/v18.0/${providerId}/posts?fields=id,message,attachments{media_type,url,description,media,target{id}},permalink_url,created_time&limit=100&access_token=${accessToken}`
        );
        
        const hashtagData = await hashtagResponse.json();
        
        if (hashtagData.error) {
          console.error('Error fetching posts:', hashtagData.error);
        } else if (hashtagData?.data?.length > 0) {

          
          const realEstateVideos = [];
          for (const post of hashtagData.data) {
            // Check if post has video attachments regardless of real estate content for troubleshooting
            if (post.attachments?.data) {
              const videoAttachments = post.attachments.data.filter(
                attachment => attachment.media_type === 'video'
              );
              
              if (videoAttachments.length > 0) {

                
                for (const video of videoAttachments) {
                  // Get video details if we have a target ID
                  if (video.target?.id) {
                    try {
                      const videoDetailResponse = await fetch(
                        `https://graph.facebook.com/v18.0/${video.target.id}?fields=id,description,source,thumbnails&access_token=${accessToken}`
                      );
                      
                      const videoDetail = await videoDetailResponse.json();
                      
                      if (videoDetail.error) {
                        console.error(`Error fetching video details for ${video.target.id}:`, videoDetail.error);
                      } else {

                        
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
                    } catch (videoError) {
                      console.error(`Error processing video ${video.target.id}:`, videoError);
                    }
                  } else {

                  }
                }
              }
            }
          }
          
          if (realEstateVideos.length > 0) {

            allVideos = [...allVideos, ...realEstateVideos];
          }
        } else {

        }
      } catch (approach1Error) {
        console.error('Error in APPROACH 1:', approach1Error);
      }
    } else {

    }
    
    // APPROACH 2: Try the direct videos endpoint
    // Only try this if we have user_videos permission
    if (permissionCheck.hasUserVideos) {

      try {
        const videosResponse = await fetch(
          `https://graph.facebook.com/v18.0/${providerId}/videos?fields=id,description,source,permalink_url,created_time,thumbnails,title,backdated_time,backdated_time_granularity&limit=50&access_token=${accessToken}`
        );
        
        const videosData = await videosResponse.json();
        
        if (videosData.error) {
          console.error('Error fetching videos:', videosData.error);
        } else if (videosData?.data?.length > 0) {

          
          const mappedVideos = videosData.data.map(video => ({
            id: video.id,
            media_type: 'VIDEO',
            media_url: video.source || null,
            permalink: video.permalink_url,
            thumbnail_url: video.thumbnails?.data?.[0]?.uri || null,
            caption: video.description || video.title || '',
            timestamp: video.created_time || video.backdated_time
          }));
          
          allVideos = [...allVideos, ...mappedVideos];
        } else {

        }
      } catch (approach2Error) {
        console.error('Error in APPROACH 2:', approach2Error);
      }
    } else {

    }
    
    // APPROACH 3: Try feed with video filters
    // Only try this if we have user_posts permission
    if (permissionCheck.hasUserPosts) {

      try {
        const feedResponse = await fetch(
          `https://graph.facebook.com/v18.0/${providerId}/feed?fields=id,message,attachments{media_type,url,description,media,target{id}},permalink_url,created_time&filter=video&limit=100&access_token=${accessToken}`
        );
        
        const feedData = await feedResponse.json();
        
        if (feedData.error) {
          console.error('Error fetching feed with video filter:', feedData.error);
        } else if (feedData?.data?.length > 0) {

          
          const feedVideos = [];
          for (const post of feedData.data) {
            if (post.attachments?.data) {
              for (const attachment of post.attachments.data) {
                if (attachment.media_type === 'video') {
                  // Try to get video source if available directly
                  let videoUrl = null;
                  let thumbnailUrl = null;
                  
                  // Extract direct video info if available
                  if (attachment.media && attachment.media.source) {
                    videoUrl = attachment.media.source;
                  } 
                  
                  if (attachment.media && attachment.media.image && attachment.media.image.src) {
                    thumbnailUrl = attachment.media.image.src;
                  }
                  
                  feedVideos.push({
                    id: attachment.target?.id || post.id,
                    media_type: 'VIDEO',
                    media_url: videoUrl,
                    permalink: post.permalink_url,
                    thumbnail_url: thumbnailUrl,
                    caption: post.message || attachment.description || '',
                    timestamp: post.created_time
                  });
                }
              }
            }
          }
          
          if (feedVideos.length > 0) {

            allVideos = [...allVideos, ...feedVideos];
          }
        } else {

        }
      } catch (approach3Error) {
        console.error('Error in APPROACH 3:', approach3Error);
      }
    } else {

    }
    
    // APPROACH 4: Try the /reel_medias endpoint (might work for some accounts)
    // Since this endpoint isn't working, we'll disable this approach
    /* 

    try {
      // ...existing code...
    } catch (approach4Error) {
      console.error('Error in APPROACH 4:', approach4Error);
    }
    */
    
    // APPROACH 5: Limited permissions approach - try to get public videos from the profile

    try {
      // This approach only uses public_profile permission
      const profileResponse = await fetch(
        `https://graph.facebook.com/v18.0/${providerId}?fields=id,name,videos.limit(5){source,description,permalink_url,thumbnails,title}&access_token=${accessToken}`
      );
      
      const profileData = await profileResponse.json();
      
      if (profileData.error) {
        console.error('Error fetching profile data:', profileData.error);
      } else if (profileData.videos && profileData.videos.data && profileData.videos.data.length > 0) {

        
        const profileVideos = profileData.videos.data.map(video => ({
          id: video.id,
          media_type: 'VIDEO',
          media_url: video.source || null,
          permalink: video.permalink_url,
          thumbnail_url: video.thumbnails?.data?.[0]?.uri || null,
          caption: video.description || video.title || '',
          timestamp: video.created_time
        }));
        
        allVideos = [...allVideos, ...profileVideos];
      } else {

      }
    } catch (approach5Error) {
      console.error('Error in APPROACH 5:', approach5Error);
    }
    
    // Remove any duplicates by ID
    const uniqueVideos = Array.from(
      new Map(allVideos.map(video => [video.id, video])).values()
    );
    
    if (uniqueVideos.length > 0) {

      return {
        videos: uniqueVideos,
        permissionIssue: false
      };
    }
    

    
    // If we have permissions but found no videos, return empty list
    if (permissionCheck.hasRequired) {
      return {
        videos: [],
        permissionIssue: false,
        noVideosFound: true
      };
    }
    
    // Otherwise indicate permission issues
    return {
      videos: [],
      permissionIssue: true,
      missingPermissions: permissionCheck.missingPermissions
    };
  } catch (error) {
    console.error('Error in fetchUserReels:', error.message);
    return {
      videos: [],
      error: error.message
    };
  }
};

/**
 * Request additional Facebook permissions
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} - Result with URL to request permissions
 */
export const requestAdditionalPermissions = async (userId) => {
  try {
    // Get app ID from environment or configuration
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '';
    
    if (!appId) {
      console.error('Facebook App ID not found in environment variables');
      return { success: false, error: 'App ID not configured' };
    }
    
    // Determine redirect URL (typically your app's callback URL)
    const redirectUri = typeof window !== 'undefined' 
      ? `${window.location.origin}/api/auth/facebook/callback`
      : '';
    
    const permissionUrl = getPermissionRequestUrl(appId, redirectUri);
    
    return {
      success: true,
      permissionUrl
    };
  } catch (error) {
    console.error('Error generating permission request:', error);
    return { success: false, error: error.message };
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
    if (!userId) {
      throw new Error('User ID is required to process reels');
    }



    // Use the API endpoint for consistent handling
    const authConfig = await getAuthHeaders();
    let response;
    
    try {
      // Always use fetch endpoint with force_fresh=true to ensure fresh data from Facebook Graph API

      response = await axios.get('/api/reels/fetch', {
        ...authConfig,
        params: { 
          force_fresh: true, // Always get fresh data from Facebook Graph API
          check_permissions: true // Add flag to check permissions
        }
      });
      

      
      // Check for permission issues in the response
      if (response.data?.permissionIssue) {
        console.warn('Permission issue detected:', response.data.missingPermissions);
        return {
          reels: [],
          permissionIssue: true,
          missingPermissions: response.data.missingPermissions
        };
      }
      
      if (response.data?.reels || response.data?.videos) {
        const reelsData = response.data.reels || response.data.videos || [];

        
        // Filter reels for real estate content if requested
        if (!noFiltering && reelsData.length > 0) {
          // Rest of filtering code remains the same
          // ...existing code...
        }
        
        return reelsData || [];
      } else {

        return [];
      }
    } catch (apiError) {
      // Enhanced error logging for debugging
      console.error('API call failed:', apiError.message);
      if (apiError.response) {
        console.error('Error response data:', apiError.response.data);
        console.error('Error response status:', apiError.response.status);
        
        // Check for permission issues in error response
        if (apiError.response.data?.permissionIssue) {
          return {
            reels: [],
            permissionIssue: true,
            missingPermissions: apiError.response.data.missingPermissions
          };
        }
      }
      
      // Try fallback to fetch if refresh fails
      if (noFiltering) {

        try {
          const fetchResponse = await axios.get('/api/reels/fetch', authConfig);
          return fetchResponse.data.reels || [];
        } catch (fetchError) {
          console.error('Fallback fetch also failed:', fetchError.message);
          throw fetchError;
        }
      } else {
        throw apiError;
      }
    }
  } catch (error) {
    console.error('Error processing reels:', error);
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
    

    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      
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

    
    // First check if we have valid auth provider data
    const { data, error } = await supabase
      .from('auth_providers')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', provider);
    
    // Check if there are duplicate entries
    if (data && data.length > 1) {

      
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

      
      const { data: userData } = await supabase
        .from('users')
        .select('facebook_access_token, facebook_user_id')
        .eq('id', userId)
        .single();
      
      if (userData?.facebook_access_token && userData?.facebook_user_id) {

        
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
  try {
    if (!userId) {
      console.error('No user ID provided for Facebook connection check');
      return false;
    }

    // First check auth_providers table
    const { data: providerData, error: providerError } = await supabase
      .from('auth_providers')
      .select('id')
      .eq('user_id', userId)
      .eq('provider', 'facebook')
      .single();

    if (providerData) {
      return true;
    }

    // Fallback: check users table for Facebook token
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('facebook_access_token')
      .eq('id', userId)
      .single();

    return !!userData?.facebook_access_token;
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