"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/auth-context';
import { ActiveProperty } from '../ActiveProperty';
import CryptoProperty from './CryptoProperty';
import { 
  checkCryptoInvestorRole, 
  getCryptoViewToggleState, 
  setCryptoViewToggleState 
} from '../../utils/PropertyUtils';
import SavePropertyButton from '../SavePropertyButton';
import { fetchLocalContext } from '../../services/localContextService';
import { logPropertyView } from '../../services/userActivityService';


const PropertyView = ({ propertyData, mlsData }) => {
  const { user, getUserRole, refreshUserData } = useAuth();
  const [userRole, setUserRole] = useState('user');
  const [isLoading, setIsLoading] = useState(true);
  const [localContext, setLocalContext] = useState(null);
  const [contextLoading, setContextLoading] = useState(true);
  const roleCheckCompleted = useRef(false);
  // Add state for crypto view toggle
  const [cryptoViewEnabled, setCryptoViewEnabled] = useState(false);
  
  // Enhanced role detection for crypto_investor
  useEffect(() => {
    const detectCryptoInvestorRole = async () => {
      if (roleCheckCompleted.current) return;
      setIsLoading(true);
      
      try {

        
        // Method 1: Direct check via getUserRole() from auth context
        if (user) {
          const authContextRole = getUserRole();

          
          if (authContextRole === 'crypto_investor') {

            setUserRole('crypto_investor');
            
            // Initialize crypto view toggle state (get from localStorage)
            const toggleState = getCryptoViewToggleState();
            setCryptoViewEnabled(toggleState);

            
            roleCheckCompleted.current = true;
            setIsLoading(false);
            return;
          }
          
          // Method 2: Check directly in user.roles array
          if (user.roles && Array.isArray(user.roles) && user.roles.includes('crypto_investor')) {

            setUserRole('crypto_investor');
            
            // Initialize crypto view toggle state (get from localStorage)
            const toggleState = getCryptoViewToggleState();
            setCryptoViewEnabled(toggleState);

            
            roleCheckCompleted.current = true;
            setIsLoading(false);
            return;
          }
        }
        
        // Method 3: Refresh user data and check again
        if (user?.id) {

          await refreshUserData(user.id);
          
          // Check again after refresh
          const refreshedRole = getUserRole();

          
          if (refreshedRole === 'crypto_investor') {

            setUserRole('crypto_investor');
            
            // Initialize crypto view toggle state (get from localStorage)
            const toggleState = getCryptoViewToggleState();
            setCryptoViewEnabled(toggleState);

            
            roleCheckCompleted.current = true;
            setIsLoading(false);
            return;
          }
        }
        
        // Method 4: Check localStorage flag which could have been set during profile creation
        if (localStorage.getItem('cryptoInvestorSelected') === 'true' && user?.id) {

          setUserRole('crypto_investor');
          
          // Initialize crypto view toggle state (get from localStorage)
          const toggleState = getCryptoViewToggleState();
          setCryptoViewEnabled(toggleState);

          
          roleCheckCompleted.current = true;
          setIsLoading(false);
          return;
        }
        
        // Method 5: Direct database check (most reliable)
        if (user?.id) {

          const isCryptoInvestor = await checkCryptoInvestorRole(user.id);
          
          if (isCryptoInvestor) {

            setUserRole('crypto_investor');
            
            // Initialize crypto view toggle state (get from localStorage)
            const toggleState = getCryptoViewToggleState();
            setCryptoViewEnabled(toggleState);

            
            roleCheckCompleted.current = true;
            setIsLoading(false);
            return;
          }
        }
        
        // If we reach here, user doesn't have crypto_investor role

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
  
  // Handle toggle click
  const handleToggleCryptoView = () => {
    const newState = !cryptoViewEnabled;

    setCryptoViewEnabled(newState);
    setCryptoViewToggleState(newState);
  };
  
  // Debug info about the template being rendered
  useEffect(() => {
    if (!isLoading) {
      ('🔹 FINAL DECISION - PropertyView will display:', 
        userRole === 'crypto_investor' && cryptoViewEnabled
          ? 'CryptoProperty template' 
          : 'ActiveProperty template'
      );
    }
  }, [userRole, isLoading, cryptoViewEnabled]);
  
  // Fetch and merge local context; pass merged object to underlying templates.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!propertyData?.ListingKey) {
        setContextLoading(false);
        return;
      }
      setContextLoading(true);
      const ctx = await fetchLocalContext(propertyData.ListingKey);
      if (!cancelled) {
        setLocalContext(ctx);
        setContextLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [propertyData?.ListingKey]);

  // Log view after local context + role checks resolved
  useEffect(() => {
    if (!isLoading && !contextLoading && user?.id && propertyData?.ListingKey) {
      logPropertyView(user.id, propertyData);
    }
  }, [isLoading, contextLoading, user?.id, propertyData?.ListingKey]);

  // Show loading state or the appropriate property template
  if (isLoading || contextLoading) {
    return <div className="animate-pulse p-4">Loading property view...</div>;
  }
  
  const mergedProperty = {
    ...propertyData,
    _localContext: localContext
  };

  return (
    <div>
      {/* Add SavePropertyButton with image URL */}
      <div className="mb-4">
        <SavePropertyButton 
          propertyId={propertyData.ListingKey}
          listingKey={propertyData.ListingKey}
          address={propertyData.UnparsedAddress}
          price={propertyData.ListPrice}
          imageUrl={propertyData.mediaUrls?.[0] || '/fallback-property.jpg'}
        />
      </div>

      {/* Toggle for crypto investors */}
      {userRole === 'crypto_investor' && (
        <div className="mb-4 p-4 bg-gradient-to-r from-purple-100 to-teal-100 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-teal-900">Crypto Property View</h3>
              <p className="text-sm text-teal-700">
                Enable to see crypto-related property information
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={cryptoViewEnabled}
                onChange={handleToggleCryptoView}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>
        </div>
      )}
      
      {/* Render the appropriate view based on role AND toggle state */}
      {userRole === 'crypto_investor' && cryptoViewEnabled ? (
        <CryptoProperty propertyData={mergedProperty} mlsData={mlsData} />
      ) : (
        <ActiveProperty property={mergedProperty} contextLoading={contextLoading} />
      )}
    </div>
  );
};

export default PropertyView;
