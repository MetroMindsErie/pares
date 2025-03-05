import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found in production' });
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Debug save-fb-token called with body:', JSON.stringify(req.body));
    
    const { user_id, token } = req.body;
    
    if (!user_id || !token) {
      return res.status(400).json({ error: 'Missing user_id or token' });
    }
    
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    // First get the user's Facebook ID if possible
    let providerId = 'debug-manual-id';
    
    try {
      const { data: userData } = await supabase.auth.admin.getUserById(user_id);
      const fbIdentity = userData?.user?.identities?.find(i => i.provider === 'facebook');
      if (fbIdentity?.id) {
        providerId = fbIdentity.id;
        console.log(`Found Facebook provider ID: ${providerId}`);
      }
    } catch (err) {
      console.log('Error getting user Facebook ID:', err);
      // Continue with default ID
    }
    
    // Update users table
    console.log(`Updating users table for user ${user_id}`);
    const userUpdate = await supabase
      .from('users')
      .update({
        facebook_access_token: token,
        facebook_user_id: providerId,
        facebook_token_updated_at: new Date().toISOString(),
        facebook_token_valid: true,
      })
      .eq('id', user_id);
    
    console.log('Users table update result:', 
      userUpdate.error ? `Error: ${userUpdate.error.message}` : 'Success');
    
    // Update auth_providers table
    console.log(`Checking for existing auth_provider for user ${user_id}`);
    const { data: existing } = await supabase
      .from('auth_providers')
      .select('id')
      .eq('user_id', user_id)
      .eq('provider', 'facebook')
      .maybeSingle();
    
    let providerUpdate;
    if (existing) {
      console.log(`Updating existing auth_provider record (ID: ${existing.id})`);
      providerUpdate = await supabase
        .from('auth_providers')
        .update({
          access_token: token,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      console.log('Creating new auth_provider record');
      providerUpdate = await supabase
        .from('auth_providers')
        .insert({
          user_id,
          provider: 'facebook',
          provider_user_id: providerId,
          access_token: token,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    }
    
    console.log('Auth providers update result:', 
      providerUpdate.error ? `Error: ${providerUpdate.error.message}` : 'Success');
    
    return res.status(200).json({
      success: true,
      users_update: !userUpdate.error,
      providers_update: !providerUpdate.error,
      users_error: userUpdate.error ? userUpdate.error.message : null,
      providers_error: providerUpdate.error ? providerUpdate.error.message : null
    });
  } catch (error) {
    console.error('Error in debug save-fb-token:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
