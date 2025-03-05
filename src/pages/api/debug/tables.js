import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    console.log('Database tables debug API called');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    // Get list of all tables
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_schema, table_name')
      .in('table_schema', ['public', 'auth'])
      .order('table_schema', { ascending: true })
      .order('table_name', { ascending: true });
      
    if (tablesError) {
      console.error('Error getting tables:', tablesError);
      return res.status(500).json({ error: 'Failed to get tables', details: tablesError });
    }
    
    // Get RLS policies
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .in('schemaname', ['public', 'auth']);
      
    if (policiesError) {
      console.error('Error getting policies:', policiesError);
      // Continue anyway
    }
    
    // Get auth providers table schema
    const { data: authProvidersSchema, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'auth_providers');
      
    if (schemaError) {
      console.log('Error getting auth_providers schema:', schemaError);
      // Continue anyway
    }
    
    return res.status(200).json({
      tables,
      policies,
      auth_providers_schema: authProvidersSchema || null,
      environment: {
        node_env: process.env.NODE_ENV,
        has_service_key: !!process.env.SUPABASE_SERVICE_KEY,
        has_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        has_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL
      }
    });
  } catch (error) {
    console.error('Error in debug tables API:', error);
    return res.status(500).json({ error: 'Internal error', details: error.message });
  }
}
