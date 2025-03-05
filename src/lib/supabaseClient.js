import { createClient } from '@supabase/supabase-js';

// Create a single supabase client for the entire app
const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default supabaseClient;
