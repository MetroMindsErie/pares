import { createClient } from '@supabase/supabase-js';

// Create Supabase client with admin privileges
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY // Fallback to anon key if service key not available
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Add detailed logging
  console.log('User create API called with body:', JSON.stringify(req.body));

  try {
    const { user_id, email } = req.body;
    
    // Validate input
    if (!user_id || !email) {
      console.log('Missing required parameters');
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Initialize Supabase with both possible keys for flexibility
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      // Use anon key as fallback
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    console.log(`Checking if user ${user_id} already exists...`);
    
    // Check if user exists with error handling
    let userExists = false;
    try {
      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('id', user_id)
        .maybeSingle();
      
      userExists = !!data;
      console.log(`User existence check: ${userExists ? 'User exists' : 'User does not exist'}`);
    } catch (checkErr) {
      console.log('Error checking user existence:', checkErr);
    }
    
    // Skip creation if user exists
    if (userExists) {
      return res.status(200).json({
        success: true,
        message: 'User already exists',
        user_id
      });
    }
    
    // Simplified user creation - only insert required fields
    console.log(`Creating user with ID ${user_id} and email ${email}`);
    try {
      const { error } = await supabase
        .from('users')
        .insert({
          id: user_id,
          email: email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Database error creating user:', error);
        throw error;
      }
      
      console.log('User created successfully');
      return res.status(201).json({
        success: true,
        message: 'User created successfully',
        user_id
      });
    } catch (insertErr) {
      console.error('Exception during user creation:', insertErr);
      return res.status(500).json({ 
        error: 'Failed to create user', 
        details: insertErr,
        message: insertErr.message || 'Unknown insertion error' 
      });
    }
  } catch (error) {
    console.error('Top-level error in create user endpoint:', error);
    return res.status(500).json({ 
      error: 'Internal error', 
      details: error,
      message: error.message || 'Unknown error'
    });
  }
}
