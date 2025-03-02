// services/users.js
import supabase from '../lib/supabase';
import { hasRole } from './auth/auth-service';

/**
 * Get all profile types
 */
export const getProfileTypes = async () => {
  try {
    const { data, error } = await supabase
      .from('profile_types')
      .select('*')
      .order('id');
      
    return { data, error };
  } catch (error) {
    console.error('Get profile types error:', error);
    return { data: null, error };
  }
};

/**
 * Get all roles
 */
export const getRoles = async () => {
  try {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('id');
      
    return { data, error };
  } catch (error) {
    console.error('Get roles error:', error);
    return { data: null, error };
  }
};

/**
 * Get user's auth providers
 */
export const getUserAuthProviders = async (userId) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) throw authError;
    
    // If no userId provided, use current user
    const targetUserId = userId || user?.id;
    
    if (!targetUserId) {
      throw new Error('No user ID provided');
    }
    
    // Check if the requesting user is allowed to view this data
    if (userId && user.id !== userId) {
      // Check if user is an admin
      const isAdmin = await hasRole('super_admin');
      if (!isAdmin) {
        throw new Error('Unauthorized to view this data');
      }
    }
    
    const { data, error } = await supabase
      .from('auth_providers')
      .select('provider, created_at')
      .eq('user_id', targetUserId);
      
    return { data, error };
  } catch (error) {
    console.error('Get user auth providers error:', error);
    return { data: null, error };
  }
};

/**
 * Add a role to a user
 * (Admin only function)
 */
export const addRoleToUser = async (userId, roleId) => {
  try {
    // Check if current user is admin
    const isAdmin = await hasRole('super_admin');
    if (!isAdmin) {
      throw new Error('Unauthorized. Admin role required.');
    }
    
    const { data, error } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role_id: roleId
      })
      .select();
      
    return { data, error };
  } catch (error) {
    console.error('Add role error:', error);
    return { data: null, error };
  }
};

/**
 * Remove a role from a user
 * (Admin only function)
 */
export const removeRoleFromUser = async (userId, roleId) => {
  try {
    // Check if current user is admin
    const isAdmin = await hasRole('super_admin');
    if (!isAdmin) {
      throw new Error('Unauthorized. Admin role required.');
    }
    
    const { data, error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role_id', roleId);
      
    return { data, error };
  } catch (error) {
    console.error('Remove role error:', error);
    return { data: null, error };
  }
};

/**
 * Get all users (admin only)
 */
export const getAllUsers = async () => {
  try {
    // Check if current user is admin
    const isAdmin = await hasRole('super_admin');
    if (!isAdmin) {
      throw new Error('Unauthorized. Admin role required.');
    }
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });
      
    return { data, error };
  } catch (error) {
    console.error('Get all users error:', error);
    return { data: null, error };
  }
};

/**
 * Delete a user (admin only)
 */
export const deleteUser = async (userId) => {
  try {
    // Check if current user is admin
    const isAdmin = await hasRole('super_admin');
    if (!isAdmin) {
      throw new Error('Unauthorized. Admin role required.');
    }
    
    // Note: When deleting from auth.users, cascade will delete from our custom tables
    const { error } = await supabase.auth.admin.deleteUser(userId);
    
    return { success: !error, error };
  } catch (error) {
    console.error('Delete user error:', error);
    return { success: false, error };
  }
};
