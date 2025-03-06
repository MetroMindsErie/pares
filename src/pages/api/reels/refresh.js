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
    const { user_id } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ error: 'Missing user_id' });
    }

    // Get Facebook access token from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('facebook_access_token, facebook_user_id')
      .eq('id', user_id)
      .single();

    if (userError || !userData?.facebook_access_token) {
      return res.status(404).json({ 
        error: 'Facebook token not found for user',
        details: userError?.message 
      });
    }

    // Use the token to fetch reels from Facebook Graph API
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${userData.facebook_user_id}/media?fields=id,media_type,media_url,thumbnail_url,permalink,caption,timestamp,children{media_url,thumbnail_url,media_type}&access_token=${userData.facebook_access_token}&limit=50`,
      { method: 'GET' }
    );

    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ 
        error: 'Facebook API error', 
        details: data.error 
      });
    }

    // Process and store the reels in your database
    const reels = data.data.filter(item => 
      item.media_type === 'VIDEO' || 
      (item.media_type === 'CAROUSEL_ALBUM' && 
       item.children?.data.some(child => child.media_type === 'VIDEO'))
    );

    // Store reels in database
    for (const reel of reels) {
      const { error: insertError } = await supabase
        .from('reels')
        .upsert({
          user_id,
          facebook_id: reel.id,
          url: reel.permalink,
          caption: reel.caption || '',
          thumbnail_url: reel.thumbnail_url || reel.media_url,
          created_at: reel.timestamp,
          updated_at: new Date().toISOString(),
          source: 'facebook',
          raw_data: reel
        }, { onConflict: 'facebook_id' });

      if (insertError) {
        console.error('Error inserting reel:', insertError);
      }
    }

    return res.status(200).json({ 
      success: true, 
      reels_count: reels.length 
    });
  } catch (error) {
    console.error('Error refreshing reels:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}
