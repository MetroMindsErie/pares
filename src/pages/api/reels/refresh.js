// Move functionality from pages/reels/refresh.js to api route
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {

    
    const { user_id, force_fresh = false } = req.body;
    

    
    if (!user_id) {
      console.error("Missing user_id in request body");
      return res.status(400).json({ error: 'Missing user_id in request body' });
    }


    
    // First try to get token from auth_providers
    let token, fbUserId;
    
    try {
      const { data: providerData, error: providerError } = await supabase
        .from('auth_providers')
        .select('access_token, provider_user_id')
        .eq('user_id', user_id)
        .eq('provider', 'facebook')
        .single();
      
      if (providerError || !providerData?.access_token) {
        // Fallback to users table

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('facebook_access_token, facebook_user_id')
          .eq('id', user_id)
          .single();

        if (userError || !userData?.facebook_access_token) {
          console.error("Facebook token not found for user:", userError || "No token in user record");
          return res.status(404).json({ 
            error: 'Facebook token not found for user',
            details: userError?.message || "No token available",
            action: "connect_facebook"
          });
        }
        
        token = userData.facebook_access_token;
        fbUserId = userData.facebook_user_id || 'me';

      } else {
        token = providerData.access_token;
        fbUserId = providerData.provider_user_id || 'me';

      }
    } catch (tokenErr) {
      console.error("Error retrieving Facebook token:", tokenErr);
      return res.status(500).json({ 
        error: 'Error retrieving Facebook token', 
        details: tokenErr.message 
      });
    }

    // Validate token first to avoid unnecessary API calls
    try {

      const validateUrl = `https://graph.facebook.com/debug_token?input_token=${token}&access_token=${token}`;
      const validateResponse = await fetch(validateUrl);
      const validateData = await validateResponse.json();
      
      if (!validateData?.data?.is_valid) {
        console.error("Token validation failed:", validateData);
        return res.status(401).json({
          error: 'Facebook token is invalid',
          details: validateData,
          action: "reconnect_facebook" 
        });
      }

    } catch (validationErr) {
      console.error("Error validating token:", validationErr);
      // Continue anyway, API might still work
    }

    // Always fetch fresh videos from Facebook Graph API

    try {
      const videosUrl = `https://graph.facebook.com/v19.0/${fbUserId || 'me'}/videos?fields=id,description,source,permalink_url,created_time,thumbnails,title,picture&video_type=reels&limit=50&access_token=${token}`;
      const videosResponse = await fetch(videosUrl);
      
      if (!videosResponse.ok) {
        const errorText = await videosResponse.text();
        console.error(`Facebook API error: ${videosResponse.status} - ${errorText}`);
        throw new Error(`Facebook API returned ${videosResponse.status}: ${errorText}`);
      }
      
      const data = await videosResponse.json();

      
      // Helper functions
      function extractHashtags(text) {
        if (!text) return [];
        const hashtagRegex = /#(\w+)/g;
        const matches = text.match(hashtagRegex);
        return matches ? matches.map(tag => tag.slice(1).toLowerCase()) : [];
      }
      
      function isRealEstateContent(text) {
        if (!text) return false;
        
        // Convert to lowercase for case-insensitive matching
        const lowerText = text.toLowerCase();
        
        // Check for explicit #realestate hashtag first
        if (/#realestate\b/.test(lowerText)) {
          return true;
        }
        
        // Extract all hashtags
        const hashtags = extractHashtags(lowerText);
        
        // Real estate related hashtags
        const realEstateHashtags = [
          'realestate', 'realtor', 'property', 'listing', 'forsale',
          'homeforsale', 'house', 'home', 'newhome', 'househunting',
          'luxuryhome', 'dreamhome', 'mortgage', 'investment',
          'realty', 'homebuying', 'homeselling', 'openhouse',
          'realestateagent', 'realestatelife', 'realestatemarket',
          'realestatesales', 'commercialrealestate'
        ];
        
        // Check if any real estate hashtags are present
        for (const tag of hashtags) {
          if (realEstateHashtags.includes(tag)) {
            return true;
          }
        }
        
        // If no direct hashtags, check for keyword phrases
        const realEstateKeywords = [
          'real estate', 'property', 'home for sale', 'house for sale',
          'mortgage', 'open house', 'new listing', 'just listed',
          'acres', 'square feet', 'bedroom', 'bathroom', 'garage',
          'backyard', 'frontyard', 'pool', 'basement'
        ];
        
        for (const keyword of realEstateKeywords) {
          if (lowerText.includes(keyword)) {
            return true;
          }
        }
        
        return false;
      }
      
      // Process and store the videos as reels
      let storedCount = 0;
      if (data.data && data.data.length > 0) {

        
        // First check for real estate videos
        const realEstateVideos = data.data.filter(video => 
          isRealEstateContent(video.description || video.title || '')
        );
        

        
        // Store all videos but prioritize real estate ones
        const videosToStore = realEstateVideos.length > 0 ? 
          realEstateVideos : 
          data.data;
        
        for (const video of videosToStore) {
          try {
            // Extract hashtags for storage
            const hashtags = extractHashtags(video.description || '');
            const isRealEstate = isRealEstateContent(video.description || video.title || '');
            
            if (isRealEstate) {

            }
            
            const { error: insertError } = await supabase
              .from('reels')
              .upsert({
                user_id: user_id,
                facebook_reel_id: video.id,
                title: video.title || video.description || 'Untitled Video',
                caption: video.description || '',
                media_url: video.source || null,
                permalink: video.permalink_url || null,
                thumbnail_url: video.picture || null,
                created_at: video.created_time || new Date().toISOString(),
                updated_at: new Date().toISOString(),
                source: 'facebook_video',
                is_real_estate: isRealEstate,
                hashtags: hashtags.length > 0 ? JSON.stringify(hashtags) : null
              }, { onConflict: 'user_id,facebook_reel_id' });

            if (insertError) {
              console.error('Error inserting video:', insertError);
            } else {
              storedCount++;
            }
          } catch (storeErr) {
            console.error(`Error storing video ${video.id}:`, storeErr);
          }
        }
      }
      
      // If we couldn't find real estate videos, try posts
      if (storedCount === 0) {

        
        const postsUrl = `https://graph.facebook.com/v19.0/${fbUserId || 'me'}/posts?fields=id,message,created_time,permalink_url,attachments{media_type,media,url,description,title,type,target}&limit=50&access_token=${token}`;
        const postsResponse = await fetch(postsUrl);
        
        if (postsResponse.ok) {
          const postsData = await postsResponse.json();
          
          if (postsData.data && postsData.data.length > 0) {

            
            for (const post of postsData.data) {
              if (post.attachments && Array.isArray(post.attachments.data)) {
                for (const att of post.attachments.data) {
                  if (att.media_type === 'video') {
                    const isRealEstate = isRealEstateContent(post.message || att.description || '');
                    const hashtags = extractHashtags(post.message || att.description || '');
                    
                    try {
                      const { error: insertError } = await supabase
                        .from('reels')
                        .upsert({
                          user_id: user_id,
                          facebook_reel_id: post.id,
                          title: att.title || post.message || 'Untitled Video',
                          caption: post.message || att.description || '',
                          media_url: att.media?.source || null,
                          permalink: post.permalink_url || null,
                          thumbnail_url: att.media?.image?.src || null,
                          created_at: post.created_time || new Date().toISOString(),
                          updated_at: new Date().toISOString(),
                          source: 'facebook_post',
                          is_real_estate: isRealEstate,
                          hashtags: hashtags.length > 0 ? JSON.stringify(hashtags) : null
                        }, { onConflict: 'user_id,facebook_reel_id' });
                        
                      if (!insertError) {
                        storedCount++;
                      }
                    } catch (insertErr) {
                      console.error(`Error storing post video ${post.id}:`, insertErr);
                    }
                  }
                }
              }
            }
          }
        }
      }
      
      // Get stored reels to return to client
      const { data: storedReels, error: fetchError } = await supabase
        .from('reels')
        .select('*')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false });
        
      if (fetchError) {
        console.error("Error fetching stored reels:", fetchError);
      }

      return res.status(200).json({ 
        success: true, 
        reels_count: storedCount,
        reels: storedReels || [],
        message: `${storedCount} reels stored successfully`
      });
    } catch (fbError) {
      console.error("Facebook fetch error:", fbError);
      return res.status(500).json({ 
        error: 'Error fetching from Facebook', 
        details: fbError.message 
      });
    }
  } catch (error) {
    console.error('Error refreshing reels:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}
