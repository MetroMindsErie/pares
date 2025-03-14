import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/auth-context';
import ActiveProperty from './ActiveProperty'; 
import CryptoProperty from './CryptoProperty';
import { checkCryptoInvestorRole } from '../../utils/PropertyUtils';

const PropertyView = ({ propertyData, mlsData }) => {
  const { user, getUserRole, refreshUserData } = useAuth();
  const [userRole, setUserRole] = useState('user');
  const [isLoading, setIsLoading] = useState(true);
  const roleCheckCompleted = useRef(false);
  
  // Enhanced role detection for crypto_investor
  useEffect(() => {
    const detectCryptoInvestorRole = async () => {
      if (roleCheckCompleted.current) return;
      setIsLoading(true);
      
      try {
        console.log('🔍 PropertyView: Checking crypto_investor role with multiple methods');
        
        // Method 1: Direct check via getUserRole() from auth context
        if (user) {
          const authContextRole = getUserRole();
          console.log('Method 1 - Auth context role:', authContextRole);
          
          if (authContextRole === 'crypto_investor') {
            console.log('✅ Found crypto_investor via auth context getUserRole()');
            setUserRole('crypto_investor');
            roleCheckCompleted.current = true;
            setIsLoading(false);
            return;
          }
          
          // Method 2: Check directly in user.roles array
          if (user.roles && Array.isArray(user.roles) && user.roles.includes('crypto_investor')) {
            console.log('✅ Found crypto_investor directly in user.roles array');
            setUserRole('crypto_investor');
            roleCheckCompleted.current = true;
            setIsLoading(false);
            return;
          }
        }
        
        // Method 3: Refresh user data and check again
        if (user?.id) {
          console.log('Method 3 - Refreshing user data to check roles');
          await refreshUserData(user.id);
          
          // Check again after refresh
          const refreshedRole = getUserRole();
          console.log('After refresh - Auth context role:', refreshedRole);
          
          if (refreshedRole === 'crypto_investor') {
            console.log('✅ Found crypto_investor after refreshing user data');
            setUserRole('crypto_investor');
            roleCheckCompleted.current = true;
            setIsLoading(false);
            return;
          }
        }
        
        // Method 4: Check localStorage flag which could have been set during profile creation
        if (localStorage.getItem('cryptoInvestorSelected') === 'true' && user?.id) {
          console.log('✅ Found crypto_investor flag in localStorage');
          setUserRole('crypto_investor');
          roleCheckCompleted.current = true;
          setIsLoading(false);
          return;
        }
        
        // Method 5: Direct database check (most reliable)
        if (user?.id) {
          console.log('Method 5 - Checking database directly');
          const isCryptoInvestor = await checkCryptoInvestorRole(user.id);
          
          if (isCryptoInvestor) {
            console.log('✅ Found crypto_investor via direct database check');
            setUserRole('crypto_investor');
            roleCheckCompleted.current = true;
            setIsLoading(false);
            return;
          }
        }
        
        // If we reach here, user doesn't have crypto_investor role
        console.log('❌ User does not have crypto_investor role after all checks');
        roleCheckCompleted.current = true;
        setUserRole('user');
        
      } catch (err) {
        console.error('Error in crypto_investor role detection:', err);
        roleCheckCompleted.current = true;
        setUserRole('user'); // Default to user role on error
      } finally {
        setIsLoading(false);
      }
    };
    
    detectCryptoInvestorRole();
    
  }, [user, getUserRole, refreshUserData]);
  
  // Debug info about the template being rendered
  useEffect(() => {
    if (!isLoading) {
      console.log('🔹 FINAL DECISION - PropertyView will display:', 
        userRole === 'crypto_investor' ? 'CryptoProperty template' : 'ActiveProperty template');
    }
  }, [userRole, isLoading]);
  
  // Show loading state or the appropriate property template
  if (isLoading) {
    return <div className="animate-pulse p-4">Loading property view...</div>;
  }
  
  // Make sure to use triple equals for strict comparison
  return userRole === 'crypto_investor' ? (
    <CryptoProperty propertyData={propertyData} mlsData={mlsData} />
  ) : (
    <ActiveProperty propertyData={propertyData} mlsData={mlsData} />
  );
};

export default PropertyView;
