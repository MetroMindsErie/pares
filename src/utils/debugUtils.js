/**
 * Debug utilities to help diagnose auth and component issues
 */

export const debugAuthState = (user, getUserRole) => {
  console.group('🔍 Auth State Debug');
  ('User object:', user ? {
    id: user.id,
    email: user.email,
    hasRoles: !!user.roles,
    roles: user.roles || []
  } : 'No user');
  
  if (getUserRole) {
    const role = getUserRole();


  } else {

  }
  
  // Check localStorage for flags
  if (typeof window !== 'undefined') {
    ('localStorage cryptoInvestorSelected:', 
      localStorage.getItem('cryptoInvestorSelected'));
  }
  console.groupEnd();
  
  return {
    user: user ? {
      id: user.id,
      hasRoles: !!user.roles,
      roles: user.roles || []
    } : null,
    role: getUserRole ? getUserRole() : 'unknown',
    isCryptoInvestor: 
      (getUserRole && getUserRole() === 'crypto_investor') || 
      (user?.roles && user.roles.includes('crypto_investor')) ||
      (typeof window !== 'undefined' && localStorage.getItem('cryptoInvestorSelected') === 'true')
  };
};

// Helper function to immediately set crypto investor flag (for testing)
export const setCryptoInvestorFlag = (value = true) => {
  if (typeof window !== 'undefined') {
    if (value) {
      localStorage.setItem('cryptoInvestorSelected', 'true');

    } else {
      localStorage.removeItem('cryptoInvestorSelected');

    }
  }
};
