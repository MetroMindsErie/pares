import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('Facebook token handler called with body:', JSON.stringify(req.body, null, 2));

  try {
    const { user_id, provider_token } = req.body;
    
    if (!user_id || !provider_token) {
      console.log('Missing required parameters');
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Create Supabase client with admin privileges for direct database access
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    console.log(`Processing Facebook token for user ${user_id}`);

    // 1. Get provider ID (Facebook user ID) from metadata
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(user_id);
    
    if (userError || !userData?.user) {
      console.error('Error fetching user data:', userError || 'User not found');
      return res.status(404).json({ error: 'User not found' });
    }

    // Extract provider ID from identities
    const fbIdentity = userData.user.identities?.find(
      (identity) => identity.provider === 'facebook'
    );

    const providerId = fbIdentity?.id || 
                       userData.user?.user_metadata?.provider_id || 
                       userData.user?.user_metadata?.sub ||
                       'unknown';
                       
    console.log(`Found Facebook provider ID: ${providerId}`);

    // 2. Store in auth_providers table FIRST (this is more reliable with RLS)
    console.log('Storing token in auth_providers table');
    
    let providerSuccess = false;
    try {
      // Try SQL function approach first (most reliable)
      const { data: funcResult, error: funcError } = await supabase.rpc('store_facebook_auth_provider', {
        p_user_id: user_id,
        p_provider_user_id: providerId,
        p_access_token: provider_token
      });
      
      if (funcError) {
        console.log('RPC function error, falling back to direct insert/update:', funcError);
        
        // Check if record exists
        const { data: existingProvider, error: checkError } = await supabase
          .from('auth_providers')
          .select('id')
          .eq('user_id', user_id)
          .eq('provider', 'facebook');
          
        if (existingProvider?.length > 0) {
          // Update
          const { error } = await supabase
            .from('auth_providers')
            .update({
              provider_user_id: providerId,
              access_token: provider_token,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingProvider[0].id);
            
          providerSuccess = !error;
          if (error) console.error('Error updating auth_providers:', error);
        } else {
          // Insert
          const { error } = await supabase
            .from('auth_providers')
            .insert({
              user_id,
              provider: 'facebook',
              provider_user_id: providerId,
              access_token: provider_token,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            
          providerSuccess = !error;
          if (error) console.error('Error inserting auth_providers:', error);
        }
      } else {
        providerSuccess = true;
        console.log('Successfully stored token via RPC function');
      }
    } catch (err) {
      console.error('Error with auth_providers operations:', err);
    }

    // 3. Update users table as backup
    console.log('Updating users table with Facebook token');
    const { error: updateError } = await supabase
      .from('users')
      .update({
        facebook_access_token: provider_token,
        facebook_user_id: providerId,
        facebook_token_updated_at: new Date().toISOString(),
        facebook_token_valid: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', user_id);

    if (updateError) {
      console.error('Error updating users table:', updateError);
    } else {
      console.log('Successfully updated users table');
    }

    // 4. Verify storage
    const { data: verifyUserData, error: verifyUserError } = await supabase
      .from('users')
      .select('facebook_access_token')
      .eq('id', user_id)
      .single();
      
    const { data: verifyProviderData, error: verifyProviderError } = await supabase
      .from('auth_providers')
      .select('access_token')
      .eq('user_id', user_id)
      .eq('provider', 'facebook')
      .maybeSingle();
    
    // Check if token was saved to at least one place
    const userTokenSaved = !verifyUserError && verifyUserData?.facebook_access_token === provider_token;
    const providerTokenSaved = !verifyProviderError && verifyProviderData?.access_token === provider_token;
    
    console.log('Verification results:', {
      userTokenSaved,
      providerTokenSaved,
      userError: verifyUserError?.message,
      providerError: verifyProviderError?.message
    });

    return res.status(200).json({
      success: userTokenSaved || providerTokenSaved,
      user_table_success: userTokenSaved,
      provider_table_success: providerTokenSaved,
      user_id,
      provider_id: providerId
    });
  } catch (error) {
    console.error('Error in Facebook token handler:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
}
