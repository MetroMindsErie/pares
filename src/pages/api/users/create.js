// Move functionality from pages/users/create.js to api route
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
    const { email, password, metadata } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata || {}
    });

    if (authError) {
      return res.status(400).json({ 
        error: 'Authentication error', 
        details: authError.message 
      });
    }

    // Create user profile in users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: authData.user.email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...metadata
      })
      .select()
      .single();

    if (userError) {
      // If profile creation fails, we should clean up the auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({ 
        error: 'Failed to create user profile', 
        details: userError.message 
      });
    }

    return res.status(201).json({ 
      user: userData,
      auth: authData.user
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}
