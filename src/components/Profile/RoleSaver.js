import React, { useEffect } from 'react';
import { useAuth } from '../../context/auth-context';
import saveUserRoles from '../../utils/saveUserRole';

/**
 * Component to ensure user roles are properly saved
 */
const RoleSaver = () => {
  const { user, refreshUserData } = useAuth();
  
  useEffect(() => {
    // Skip processing completely if:
    // 1. No user
    // 2. We've already run this operation for this user
    // 3. No crypto investor flag is set
    if (!user?.id || 
        localStorage.getItem(`roleSaverRun_${user.id}`) === 'true' ||
        localStorage.getItem('cryptoInvestorSelected') !== 'true') {
      return;
    }

    // Simple one-time fix for missing roles
    const fixRoles = async () => {
      try {
        // Mark as run immediately
        localStorage.setItem(`roleSaverRun_${user.id}`, 'true');

        // Get current roles
        const currentRoles = Array.isArray(user.roles) ? 
          [...user.roles] : ['user'];
            
        // Only proceed if crypto_investor isn't already in roles
        if (!currentRoles.includes('crypto_investor')) {

          const newRoles = [...currentRoles, 'crypto_investor'];
            
          // Update database directly
          await saveUserRoles(user.id, newRoles);
          
          // Wait for refresh to complete
          await refreshUserData(user.id);
        }
        
        // Always clear crypto flag to prevent further attempts
        localStorage.removeItem('cryptoInvestorSelected');
      } catch (err) {
        console.error('RoleSaver error:', err);
        // Still mark as run to prevent infinite attempts
        localStorage.setItem(`roleSaverRun_${user.id}`, 'true');
      }
    };
    
    // Execute with minimal delay
    setTimeout(fixRoles, 300);
  }, [user?.id]); // Only depends on user.id to prevent reruns

  return null; // Render nothing
};

export default RoleSaver;
