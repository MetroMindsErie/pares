import supabase from '../lib/supabase-setup';

/**
 * Check if user has crypto investor role
 */
export const checkCryptoInvestorRole = async (userId) => {
  if (!userId) return false;
  
  try {
    console.log('Direct DB check for crypto role:', userId);
    
    // Direct database check to bypass potential context issues
    const { data, error } = await supabase
      .from('users')
      .select('roles')
      .eq('id', userId)
      .single();
      
    if (error) {
      console.error('Error checking crypto investor role:', error);
      return false;
    }
    
    if (data && Array.isArray(data.roles)) {
      const hasCryptoRole = data.roles.includes('crypto_investor');
      console.log('DB check result for crypto role:', hasCryptoRole);
      
      if (hasCryptoRole) {
        // Set localStorage flag to prevent future checks
        localStorage.setItem('cryptoInvestorSelected', 'true');
      }
      
      return hasCryptoRole;
    }
    
    return false;
  } catch (err) {
    console.error('Error in checkCryptoInvestorRole:', err);
    return false;
  }
};

/**
 * Force sync check for crypto investor role with no async
 * For immediate UI decisions
 */
export const hasCryptoInvestorRoleSync = () => {
  // Try localStorage first (fastest)
  if (localStorage.getItem('cryptoInvestorSelected') === 'true') {
    return true;
  }
  
  // Try URL parameter (for testing)
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('cryptomode') === 'true') {
      return true;
    }
  }
  
  return false;
};

/**
 * Get property template to use based on user role
 */
export const getPropertyTemplate = async (userId) => {
  // First check sync methods
  if (hasCryptoInvestorRoleSync()) {
    return 'crypto';
  }
  
  // Then check async
  if (!userId) return 'standard';
  
  const isCryptoInvestor = await checkCryptoInvestorRole(userId);
  return isCryptoInvestor ? 'crypto' : 'standard';
};

export default {
  checkCryptoInvestorRole,
  getPropertyTemplate,
  hasCryptoInvestorRoleSync
};
