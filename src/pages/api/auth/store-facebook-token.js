import { createClient } from '@supabase/supabase-js';
import { edgeHandler } from '../../../lib/edgeHandler';
import { getUserFromAuthHeader } from '../../../lib/apiAuth';


// Initialize with service key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default edgeHandler(async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Callers may only store tokens for their own account.
    const caller = await getUserFromAuthHeader(req.headers['authorization']);
    if (!caller) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { user_id, access_token, provider_user_id } = req.body;
    if (!user_id || !access_token) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    if (user_id !== caller.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userData = { user: caller };

    let fbUserId = provider_user_id;
    if (!fbUserId) {
      try {
        const fbResponse = await fetch(`https://graph.facebook.com/me?access_token=${access_token}`);
        const fbData = await fbResponse.json();
        fbUserId = fbData.id;
      } catch (fbError) {
        console.error('Error fetching Facebook user data:', fbError);
        fbUserId = userData.user.user_metadata?.provider_id || 'unknown';
      }
    }
    
    const { error: providerError } = await supabase
      .from('auth_providers')
      .upsert({
        user_id,
        provider: 'facebook',
        provider_user_id: fbUserId,
        access_token,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,provider' });
    
    if (providerError) {
      console.error('Error storing in auth_providers:', providerError);
    }
    
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({
        facebook_access_token: access_token,
        facebook_user_id: fbUserId,
        facebook_token_valid: true,
        facebook_token_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user_id);
    
    if (userUpdateError) {
      console.error('Error updating users table:', userUpdateError);
    }
    
    return res.status(200).json({
      success: true,
      provider_user_id: fbUserId
    });
  } catch (error) {
    console.error('Error in store-facebook-token:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

);

export const runtime = 'edge';
