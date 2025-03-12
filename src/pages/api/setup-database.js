import { createClient } from '@supabase/supabase-js';

// Only use service role client for admin operations
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ADMIN_KEY
);

export default async function handler(req, res) {
  // Ensure this is only accessible by admins - add proper authorization checks
  if (!req.headers.authorization) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    // Create auth_providers table if it doesn't exist
    const { error: authProvidersError } = await adminSupabase.rpc('create_auth_providers_if_not_exists');
    
    if (authProvidersError) {
      console.error('Error creating auth_providers table:', authProvidersError);
      return res.status(500).json({ error: 'Failed to create auth_providers table' });
    }
    
    // Create reels table if it doesn't exist
    const { error: reelsError } = await adminSupabase.rpc('create_reels_if_not_exists');
    
    if (reelsError) {
      console.error('Error creating reels table:', reelsError);
      return res.status(500).json({ error: 'Failed to create reels table' });
    }
    
    // Return success message
    return res.status(200).json({ success: true, message: 'Database setup completed' });
  } catch (error) {
    console.error('Database setup error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
