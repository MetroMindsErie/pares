import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // This endpoint is for debugging purposes only
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    const { user_id, access_token, provider_user_id } = req.body;
    
    if (!user_id || !access_token || !provider_user_id) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // 1. Update users table
    console.log('Updating users table...');
    const { error: userError } = await supabase.rpc('direct_update_user_facebook', {
      p_user_id: user_id,
      p_access_token: access_token,
      p_facebook_user_id: provider_user_id
    });

    if (userError) {
      console.error('Error updating users table:', userError);
      return res.status(500).json({ error: 'Failed to update users table', details: userError });
    }

    // 2. Insert/update auth_providers table
    console.log('Updating auth_providers table...');
    const { error: providerError } = await supabase.rpc('store_facebook_auth_provider', {
      p_user_id: user_id,
      p_provider_user_id: provider_user_id,
      p_access_token: access_token
    });

    if (providerError) {
      console.error('Error updating auth_providers table:', providerError);
      return res.status(500).json({ error: 'Failed to update auth_providers table', details: providerError });
    }

    // 3. Verify the updates
    const results = await Promise.all([
      supabase.from('users').select('facebook_access_token, facebook_user_id, facebook_token_valid').eq('id', user_id).single(),
      supabase.from('auth_providers').select('provider_user_id, access_token').eq('user_id', user_id).eq('provider', 'facebook').single()
    ]);

    return res.status(200).json({
      success: true,
      users_table: results[0].data,
      auth_providers_table: results[1].data,
      users_error: results[0].error,
      auth_providers_error: results[1].error
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
