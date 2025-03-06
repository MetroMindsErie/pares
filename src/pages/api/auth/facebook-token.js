// Move functionality from pages/auth/facebook-token.js to api route
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id } = req.query;
    
    if (!user_id) {
      return res.status(400).json({ error: 'Missing user_id parameter' });
    }

    // Get Facebook token from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('facebook_access_token, facebook_user_id, facebook_token_valid, facebook_token_updated_at')
      .eq('id', user_id)
      .single();

    if (userError) {
      return res.status(404).json({ 
        error: 'User not found', 
        details: userError.message 
      });
    }

    // Check if token exists
    if (!userData.facebook_access_token) {
      return res.status(404).json({ 
        error: 'Facebook token not found for user'
      });
    }

    return res.status(200).json({ 
      token: userData.facebook_access_token,
      facebook_user_id: userData.facebook_user_id,
      is_valid: userData.facebook_token_valid,
      last_updated: userData.facebook_token_updated_at
    });
  } catch (error) {
    console.error('Error fetching Facebook token:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}
