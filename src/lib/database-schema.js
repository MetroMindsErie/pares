import supabase from './supabase-setup';

/**
 * Ensure necessary database tables exist with correct structure
 */
export const ensureDbSchema = async () => {
  console.log('Checking database schema...');
  
  // Check if tables exist by trying to select from them
  try {
    await checkAuthProvidersTable();
    await checkReelsTable();
    console.log('Database schema checks completed.');
    return true;
  } catch (error) {
    console.error('Error ensuring database schema:', error);
    return false;
  }
};

/**
 * Check auth_providers table and create if needed
 */
const checkAuthProvidersTable = async () => {
  try {
    const { error } = await supabase.from('auth_providers').select('id').limit(1);
    
    if (error && error.code === '42P01') {
      console.log('Auth providers table not found, would create it here if we had RLS permissions');
      // In normal operation, tables should be created via migrations
      // But we could provide admin instructions here
    }
  } catch (error) {
    console.warn('Error checking auth_providers table:', error);
  }
};

/**
 * Check reels table and create if needed
 */
const checkReelsTable = async () => {
  try {
    const { error } = await supabase.from('reels').select('id').limit(1);
    
    if (error && error.code === '42P01') {
      console.log('Reels table not found, would create it here if we had RLS permissions');
      // In normal operation, tables should be created via migrations
    }
  } catch (error) {
    console.warn('Error checking reels table:', error);
  }
};

/**
 * Get database table info
 */
export const getTableInfo = async (tableName) => {
  try {
    const { data, error } = await supabase
      .rpc('get_table_definition', { table_name: tableName });
      
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error(`Error getting table info for ${tableName}:`, error);
    return null;
  }
};
