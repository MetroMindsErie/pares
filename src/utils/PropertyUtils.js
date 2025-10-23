import supabase from '../lib/supabase-setup';

/**
 * Check if user has crypto investor role
 */
export const checkCryptoInvestorRole = async (userId) => {
  if (!userId) return false;
  
  try {

    
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
 * Check if crypto view is currently toggled on
 */
export const getCryptoViewToggleState = () => {
  return localStorage.getItem('cryptoViewEnabled') === 'true';
};

/**
 * Set crypto view toggle state
 */
export const setCryptoViewToggleState = (enabled) => {
  localStorage.setItem('cryptoViewEnabled', enabled ? 'true' : 'false');
};

/**
 * Get property template to use based on user role
 */
export const getPropertyTemplate = async (userId) => {
  // Check if user has crypto investor role
  let isCryptoInvestor = hasCryptoInvestorRoleSync();
  
  if (!isCryptoInvestor && userId) {
    isCryptoInvestor = await checkCryptoInvestorRole(userId);
  }
  
  // Only show crypto view if user is a crypto investor AND has toggled it on
  if (isCryptoInvestor) {
    const cryptoViewEnabled = getCryptoViewToggleState();
    return cryptoViewEnabled ? 'crypto' : 'standard';
  }
  
  // Always standard view for non-crypto investors
  return 'standard';
};

export default {
  checkCryptoInvestorRole,
  getPropertyTemplate,
  hasCryptoInvestorRoleSync,
  getCryptoViewToggleState,
  setCryptoViewToggleState
};
