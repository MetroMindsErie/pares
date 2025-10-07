import { createClient } from '@supabase/supabase-js';
import { supabase } from '../src/utils/supabaseClient';

// Export the existing Supabase client for database operations
export const supabaseClient = supabase;

// Export a pool-like interface that wraps Supabase for compatibility with existing code
export const pool = {
  query: async (text, params = []) => {
    const { data, error } = await supabase.rpc('query_raw', {
      query_text: text,
      query_params: params
    });

    if (error) {
      throw error;
    }

    return { rows: data || [] };
  }
};
