import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xyzcompany.supabase.co';
const supabaseKey = 'public-anon-key';
export const supabase = createClient(supabaseUrl, supabaseKey, {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage
});

// Prevent multiple instances
if (!window._supabaseClient) {
    window._supabaseClient = supabase;
}

// ...existing code...
