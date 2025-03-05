import { createClient } from '@supabase/supabase-js';

// Create Supabase client with admin privileges
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not available in production' });
  }
  
  try {
    // Check if users table exists and its structure
    const { data: usersInfo, error: usersError } = await supabase
      .rpc('check_table_exists', { tablename: 'users' });
      
    if (usersError) {
      return res.status(500).json({
        error: 'Error checking users table',
        details: usersError.message
      });
    }
    
    // Get schema info about the users table
    const { data: usersSchema, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'users');
    
    // Check RLS policies
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'users');
      
    return res.status(200).json({
      message: 'Database check completed',
      tables: {
        users: {
          exists: !!usersInfo,
          error: usersError?.message || null,
          columns: usersSchema || [],
          columnsError: schemaError?.message || null,
        },
      },
      rls: {
        policies: policies || [],
        error: policiesError?.message || null
      }
    });
  } catch (error) {
    console.error('Database check error:', error);
    return res.status(500).json({ error: 'Database check failed', details: error.message });
  }
}
