import supabase from '../lib/supabase-setup';

/**
 * Force save user roles to ensure they're properly stored in the database
 */
export const saveUserRoles = async (userId, roles) => {
  if (!userId || !Array.isArray(roles)) {
    console.error('Invalid parameters for saveUserRoles');
    return false;
  }

  try {
    // Ensure 'user' role is always included
    if (!roles.includes('user')) {
      roles.push('user');
    }
    
    console.log('saveUserRoles: Saving roles for user', userId, roles);
    
    // Try three different approaches to maximize chances of success
    
    // Approach 1: Standard update
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        roles: roles,
        updated_at: new Date().toISOString() 
      })
      .eq('id', userId);
      
    if (updateError) {
      console.error('Standard update failed:', updateError);
    } else {
      console.log('Standard update succeeded');
    }
    
    // Approach 2: RPC if available
    try {
      const { error: rpcError } = await supabase.rpc('update_user_roles', {
        user_id: userId,
        new_roles: roles
      });
      
      if (rpcError) {
        console.error('RPC update failed:', rpcError);
      } else {
        console.log('RPC update succeeded');
      }
    } catch (rpcErr) {
      // RPC might not exist, ignore this error
      console.log('RPC not available, skipping');
    }
    
    // Approach 3: Raw SQL as last resort
    try {
      const { error: rawError } = await supabase.rpc('execute_sql', {
        sql: `UPDATE public.users SET roles = '${JSON.stringify(roles)}', updated_at = NOW() WHERE id = '${userId}'`
      });
      
      if (rawError) {
        console.error('Raw SQL update failed:', rawError);
      } else {
        console.log('Raw SQL update succeeded');
      }
    } catch (sqlErr) {
      // Raw SQL might not be available, ignore this error
      console.log('Raw SQL not available, skipping');
    }
    
    // Verify if any of the approaches worked
    const { data, error } = await supabase
      .from('users')
      .select('roles')
      .eq('id', userId)
      .single();
      
    if (error) {
      console.error('Error verifying roles update:', error);
      return false;
    }
    
    const hasAllRoles = roles.every(
      role => Array.isArray(data.roles) && data.roles.includes(role)
    );
    
    console.log('Role verification:', hasAllRoles ? 'Success' : 'Failed', 
      'Expected:', roles, 'Got:', data.roles);
      
    return hasAllRoles;
  } catch (err) {
    console.error('Unexpected error in saveUserRoles:', err);
    return false;
  }
};

export default saveUserRoles;
