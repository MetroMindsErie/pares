import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Allow only in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not available in production' });
  }

  try {
    console.log('Auth providers check API called');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    // Test if table exists
    console.log('Testing if auth_providers table exists...');
    const { data: existsCheck, error: existsError } = await supabase.rpc('table_exists', {
      table_name: 'auth_providers'
    });
    
    if (existsError) {
      console.error('Error checking table existence:', existsError);
      
      // Try direct approach
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_name', 'auth_providers');
      
      if (tablesError) {
        console.error('Error checking tables:', tablesError);
        return res.status(500).json({ 
          error: 'Error checking tables', 
          details: tablesError 
        });
      }
      
      const tableExists = tables && tables.length > 0;
      console.log(`Table existence check: ${tableExists ? 'Table exists' : 'Table does not exist'}`);
      
      if (!tableExists) {
        return res.status(200).json({
          message: 'Auth providers table does not exist',
          exists: false,
          should_create: true
        });
      }
    } else if (!existsCheck) {
      console.log('Table existence check: Table does not exist');
      return res.status(200).json({
        message: 'Auth providers table does not exist',
        exists: false,
        should_create: true
      });
    }
    
    console.log('Auth providers table exists, checking for data...');
    
    // Try to query the table
    const { data, error } = await supabase
      .from('auth_providers')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Error querying auth providers:', error);
      return res.status(500).json({
        error: 'Error querying auth_providers table',
        details: error,
        message: 'Table exists but cannot be queried'
      });
    }
    
    return res.status(200).json({
      message: 'Auth providers table exists and is queryable',
      exists: true,
      data_sample: data
    });
  } catch (error) {
    console.error('Error in auth providers check API:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'Unknown error'
    });
  }
}
