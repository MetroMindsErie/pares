import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('Missing Supabase env vars in API route');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const { userId, profileData } = req.body || {};

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'userId is required' });
    }
    if (!profileData || typeof profileData !== 'object') {
      return res.status(400).json({ error: 'profileData is required' });
    }

    // Verify the user actually exists in the database
    const { data: existingUser, error: lookupErr } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (lookupErr || !existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Sanitise — strip fields that should never be set from the client
    const safeData = { ...profileData };
    delete safeData.id;
    delete safeData.created_at;
    delete safeData.subscription_tier;

    safeData.updated_at = new Date().toISOString();
    safeData.hasprofile = true;

    const { error: updateError } = await supabase
      .from('users')
      .update(safeData)
      .eq('id', userId);

    if (updateError) {
      console.error('Profile update error:', updateError);
      return res.status(500).json({ error: 'Failed to update profile', details: updateError.message });
    }

    // Verify
    const { data: updated, error: verifyError } = await supabase
      .from('users')
      .select('first_name, last_name, email, phone, city, state, zip_code, roles, interests, hasprofile, updated_at')
      .eq('id', userId)
      .single();

    if (verifyError) {
      console.error('Verify error:', verifyError);
      return res.status(200).json({ success: true, profile: null });
    }

    return res.status(200).json({ success: true, profile: updated });
  } catch (err) {
    console.error('Unexpected error in profile update API:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}
