import { createClient } from '@supabase/supabase-js';
import { validateFacebookToken } from '../../../services/facebookServices';

// Create Supabase client with admin privileges
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('Facebook callback API called');

  try {
    const { access_token, user_id } = req.body;
    
    if (!access_token || !user_id) {
      console.log('Missing required parameters in request');
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Get the user from the auth token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No valid authorization header');
      return res.status(401).json({ error: 'Missing authorization header' });
    }
    
    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.log('Invalid auth token or user not found', authError?.message);
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    console.log(`Processing Facebook token for user: ${user.id}, Facebook ID: ${user_id}`);

    // Validate Facebook token before storing
    const tokenValidation = await validateFacebookToken(access_token);
    if (!tokenValidation.valid) {
      console.error('Invalid Facebook token:', tokenValidation.error);
      return res.status(400).json({ 
        error: 'Invalid Facebook token', 
        details: tokenValidation.error 
      });
    }

    // Store token using our SQL functions with elevated privileges
    console.log('Storing Facebook token using SQL functions...');
    
    // 1. Update users table with Facebook token
    const { error: userError } = await supabase.rpc('direct_update_user_facebook', {
      p_user_id: user.id,
      p_access_token: access_token,
      p_facebook_user_id: user_id
    });

    if (userError) {
      console.error('Error updating users table:', userError);
      // Continue trying the auth_providers table anyway
    } else {
      console.log('Successfully updated users table with Facebook token');
    }

    // 2. Update auth_providers table with Facebook token
    const { error: providerError } = await supabase.rpc('store_facebook_auth_provider', {
      p_user_id: user.id,
      p_provider_user_id: user_id,
      p_access_token: access_token
    });

    if (providerError) {
      console.error('Error updating auth_providers table:', providerError);
      // If this fails too we're in trouble, but at least we tried the users table first
    } else {
      console.log('Successfully updated auth_providers table with Facebook token');
    }

    // 3. Verify that token was actually stored somewhere
    const { data: hasToken } = await supabase.rpc('does_user_have_facebook_token', {
      p_user_id: user.id
    });

    if (!hasToken) {
      console.error('Facebook token verification failed: not stored in any table');
      return res.status(500).json({ 
        error: 'Failed to store Facebook token', 
        details: 'Token verification failed'
      });
    }

    console.log('Facebook token successfully stored and verified');
    
    return res.status(200).json({ 
      status: 'success', 
      message: 'Facebook authentication successful',
      token_stored: true
    });
  } catch (error) {
    console.error('Facebook callback error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
