import { createClient } from '@supabase/supabase-js';

// This script can be run directly to create or update the auth_providers table
const main = async () => {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );



    // Check if table exists
    const { error: checkError } = await supabase
      .from('auth_providers')
      .select('id')
      .limit(1);

    // Create table if it doesn't exist
    if (checkError && checkError.code === 'PGRST116') {

      
      // Create the table using SQL
      const { error: createError } = await supabase.rpc('create_auth_providers_table', {});
      
      if (createError) {
        console.error('Error creating table:', createError);
        
        // If RPC fails, try direct SQL (requires more permissions)
        const { error: sqlError } = await supabase.rpc('execute_sql', {
          sql: `
            CREATE TABLE IF NOT EXISTS auth_providers (
              id SERIAL PRIMARY KEY,
              user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
              provider VARCHAR(255) NOT NULL,
              provider_user_id VARCHAR(255),
              access_token TEXT NOT NULL,
              refresh_token TEXT,
              token_expiry TIMESTAMP WITH TIME ZONE,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(user_id, provider)
            );
            
            -- Add indexes for performance
            CREATE INDEX IF NOT EXISTS auth_providers_user_id_idx ON auth_providers(user_id);
            CREATE INDEX IF NOT EXISTS auth_providers_provider_idx ON auth_providers(provider);
          `
        });
        
        if (sqlError) {
          throw sqlError;
        }
      }
      

    } else {

      
      // Check if all needed columns exist, add them if needed
      // This would require more complex SQL that depends on your Supabase permissions
    }


  } catch (error) {
    console.error('Failed to set up database:', error);
  }
};

// Export for programmatic use
export const setupAuthProvidersTable = main;

// Allow direct execution
if (require.main === module) {
  main();
}
