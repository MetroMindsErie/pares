import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // Handle token operations
  if (req.method === 'GET') {
    // Get token for a user
    try {
      const { user_id, provider = 'facebook' } = req.query;
      
      if (!user_id) {
        return res.status(400).json({ error: 'Missing user_id parameter' });
      }

      // Get token from auth_providers table
      const { data: providerData, error: providerError } = await supabase
        .from('auth_providers')
        .select('access_token, provider_user_id, updated_at')
        .eq('user_id', user_id)
        .eq('provider', provider)
        .single();

      if (providerError || !providerData) {
        // Try getting from users table as fallback
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select(`${provider}_access_token, ${provider}_user_id, ${provider}_token_updated_at`)
          .eq('id', user_id)
          .single();

        if (userError || !userData?.[`${provider}_access_token`]) {
          return res.status(404).json({ 
            error: `${provider} token not found for user` 
          });
        }

        return res.status(200).json({
          token: userData[`${provider}_access_token`],
          provider_user_id: userData[`${provider}_user_id`],
          last_updated: userData[`${provider}_token_updated_at`]
        });
      }

      return res.status(200).json({
        token: providerData.access_token,
        provider_user_id: providerData.provider_user_id,
        last_updated: providerData.updated_at
      });
    } catch (error) {
      console.error('Error getting token:', error);
      return res.status(500).json({ 
        error: 'Internal server error', 
        details: error.message 
      });
    }
  } else if (req.method === 'POST') {
    // Store new token
    try {
      const { user_id, provider = 'facebook', access_token, provider_user_id } = req.body;
      
      if (!user_id || !access_token) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }

      // Store in auth_providers table
      const { error: providerError } = await supabase
        .from('auth_providers')
        .upsert({
          user_id,
          provider,
          provider_user_id,
          access_token,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,provider' });

      if (providerError) {
        console.error('Error storing token in auth_providers:', providerError);
      }

      // Also update users table for redundancy
      const updateData = {};
      updateData[`${provider}_access_token`] = access_token;
      updateData[`${provider}_user_id`] = provider_user_id;
      updateData[`${provider}_token_valid`] = true;
      updateData[`${provider}_token_updated_at`] = new Date().toISOString();
      updateData.updated_at = new Date().toISOString();

      const { error: userError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user_id);

      if (userError) {
        console.error('Error updating users table:', userError);
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error storing token:', error);
      return res.status(500).json({ 
        error: 'Internal server error', 
        details: error.message 
      });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
