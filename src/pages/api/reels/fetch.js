import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Initialize Supabase client with the request context
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: { 
        headers: { cookie: req.headers.cookie } 
      }
    }
  );

  try {
    // Get user from session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error("Session error:", sessionError);
      return res.status(401).json({ error: 'Session error', details: sessionError.message });
    }
    if (!session?.user) {
      // Try getting user from Authorization header
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        // Create admin client to verify token
        const adminClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY
        );
        const { data: userData, error: verifyError } = await adminClient.auth.getUser(token);
        if (verifyError || !userData?.user) {
          console.error("Token verification failed:", verifyError);
          return res.status(401).json({ error: 'Not authenticated' });
        }
        // Use the admin client for the rest of the operations
        return await fetchUserReels(adminClient, userData.user.id, res);
      }
      return res.status(401).json({ error: 'Not authenticated' });
    }
    // Standard path - use session user
    return await fetchUserReels(supabase, session.user.id, res);
  } catch (error) {
    console.error('Error in reels fetch handler:', error);
    return res.status(500).json({ error: 'Failed to fetch reels', details: error.message });
  }
}

async function fetchUserReels(supabaseClient, userId, res) {
  try {
    // Attempt to get Facebook token from auth_providers table
    const { data: providerData, error: providerError } = await supabaseClient
      .from('auth_providers')
      .select('access_token, provider_user_id')
      .eq('user_id', userId)
      .eq('provider', 'facebook')
      .single();

    let token, fbUserId;
    if (providerError || !providerData?.access_token) {
      // Fallback: get Facebook token from users table
      const { data: userData, error: userError } = await supabaseClient
        .from('users')
        .select('facebook_access_token, facebook_user_id')
        .eq('id', userId)
        .single();
      if (userError || !userData?.facebook_access_token) {
        return res.status(404).json({
          error: 'Facebook access token not found',
          action: 'connect_facebook'
        });
      }
      token = userData.facebook_access_token;
      fbUserId = userData.facebook_user_id || 'me';
    } else {
      token = providerData.access_token;
      fbUserId = providerData.provider_user_id || 'me';
    }
    // Proceed to fetch user content (reels)
    return await fetchUserContent(token, fbUserId, res);
  } catch (error) {
    console.error('Error retrieving Facebook token:', error);
    return res.status(500).json({ error: 'Failed to retrieve Facebook token' });
  }
}

async function fetchUserContent(token, userId, res) {
  try {
    console.log(`Fetching reels for Facebook user: ${userId}`);
    
    // 1️⃣ Attempt: fetch videos using video_type=reels
    const videosResponse = await fetch(
      `https://graph.facebook.com/v18.0/${userId}/videos?fields=id,description,source,permalink_url,created_time,thumbnails&video_type=reels&limit=50&access_token=${token}`
    );
    const videosData = await videosResponse.json();
    console.log("User videos (reels attempt) response:", JSON.stringify(videosData, null, 2));

    let reels = [];
    if (videosData && Array.isArray(videosData.data) && videosData.data.length > 0) {
      console.log(videosData)
      reels = videosData.data.map(video => ({
        id: video.id,
        // Use the video description as caption if title is not provided.
        title: video.description || 'Untitled Reel',
        description: video.description || '',
        video_url: video.source,
        permalink_url: video.permalink_url,
        embed_url: video.permalink_url,  // fallback if needed
        created_at: video.created_time,
        source: 'video'
      }));
    } else {
      // 2️⃣ Fallback: query posts for video attachments if no reels returned
      console.log("No reels found via /videos?video_type=reels. Falling back to /posts...");
      const postsResponse = await fetch(
        `https://graph.facebook.com/v18.0/${userId}/posts?fields=id,message,created_time,permalink_url,attachments{media_type,media,url}&limit=50&access_token=${token}`
      );
      const postsData = await postsResponse.json();
      console.log("User posts response:", JSON.stringify(postsData, null, 2));
      
      reels = (postsData.data || []).reduce((acc, post) => {
        if (post.attachments && Array.isArray(post.attachments.data)) {
          // Find the first attachment with a video type
          const videoAttachment = post.attachments.data.find(att => att.media_type === 'video');
          if (videoAttachment) {
            // Use the post's message as caption.
            const caption = post.message || '';
            console.log(`Post ${post.id} contains video attachment. Caption: ${caption}`);
            acc.push({
              id: post.id,
              title: caption || 'Untitled Reel', // use caption as title
              description: caption,
              video_url: videoAttachment.media?.source || '',
              permalink_url: post.permalink_url,
              // Use the attachment's URL if available (this is often the reel URL)
              embed_url: videoAttachment.url || post.permalink_url,
              created_at: post.created_time,
              source: 'post'
            });
          }
        }
        return acc;
      }, []);
    }
    
    // 3️⃣ Filter reels that include the hashtag #realestate
    const extractHashtags = text => {
      if (!text) return [];
      const hashtagRegex = /#(\w+)/g;
      const matches = text.match(hashtagRegex);
      return matches ? matches.map(tag => tag.substring(1).toLowerCase()) : [];
    };
    
    let filteredReels = reels.filter(item => {
      const hashtags = extractHashtags(item.description || item.title);
      return hashtags.includes('realestate');
    });
    console.log("Filtered User Reels (with #realestate):", JSON.stringify(filteredReels, null, 2));

    // 4️⃣ Enrich reels that lack a direct video_url using Facebook's oEmbed endpoint.
    // Use the embed_url (which should be a proper reel URL) for the oEmbed query.
    const enrichedReels = await Promise.all(filteredReels.map(async (reel) => {
      if (!reel.video_url && reel.embed_url) {
        try {
          const oEmbedUrl = `https://www.facebook.com/plugins/video/oembed.json/?url=${encodeURIComponent(reel.embed_url)}&autoplay=true`;
          const oEmbedResponse = await fetch(oEmbedUrl);
          const contentType = oEmbedResponse.headers.get("content-type") || "";
          let embedHtml = "";
          if (contentType.includes("application/json")) {
            const oEmbedData = await oEmbedResponse.json();
            embedHtml = oEmbedData.html;
          } else {
            embedHtml = await oEmbedResponse.text();
          }
          console.log(`Fetched oEmbed for reel ${reel.id}:`, embedHtml);
          return { ...reel, embedHtml };
        } catch (err) {
          console.error(`Failed to fetch embed code for reel ${reel.id}:`, err);
          return reel;
        }
      }
      return reel;
    }));

    return res.status(200).json({
      reels: enrichedReels,
      count: enrichedReels.length,
      cached: false
    });
  } catch (error) {
    console.error('Error fetching user content from Facebook:', error);
    return res.status(500).json({
      error: 'Failed to fetch user content',
      details: error.message
    });
  }
}


