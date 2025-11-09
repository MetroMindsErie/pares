import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/auth-context';
import ActiveProperty from './Property/ActiveProperty';
import CryptoProperty from './Property/CryptoProperty';
import supabase from '../lib/supabase-setup';

const PropertyDetail = ({ property, onClose }) => {
  // Force crypto mode with query param for testing - remove in production
  const [forceMode, setForceMode] = useState(null);
  const { user, getUserRole, refreshUserData } = useAuth();
  const [isCryptoInvestor, setIsCryptoInvestor] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const roleCheckCompleted = useRef(false);
  
  // Set localStorage flag immediately if user has crypto_investor role
  // This happens at component initialization
  useEffect(() => {
    if (user?.roles?.includes('crypto_investor')) {
      ('Setting cryptoInvestorSelected flag based on user object role');
      localStorage.setItem('cryptoInvestorSelected', 'true');
      setIsCryptoInvestor(true);
      roleCheckCompleted.current = true;
      setIsLoading(false);
    }
    
    // Also check getUserRole immediately
    if (user && getUserRole() === 'crypto_investor') {
      ('Setting cryptoInvestorSelected flag based on getUserRole()');
      localStorage.setItem('cryptoInvestorSelected', 'true');
      setIsCryptoInvestor(true);
      roleCheckCompleted.current = true;
      setIsLoading(false);
    }
  }, [user, getUserRole]);
  
  // Force mode from URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check URL for force parameter (for debugging)
      const params = new URLSearchParams(window.location.search);
      if (params.get('force') === 'crypto') {
        ('⚠️ Forcing CRYPTO template via URL parameter');
        setForceMode('crypto');
        setIsCryptoInvestor(true);
        setIsLoading(false);
      }
    }
  }, []);
  
  // Enhanced check for crypto_investor role 
  useEffect(() => {
    const detectCryptoInvestorRole = async () => {
      // Skip if already completed
      if (forceMode || roleCheckCompleted.current) return;
      
      // Skip if no user ID
      if (!user?.id) {
        setIsLoading(false);
        return;
      }
      
      try {
        ('PropertyDetail: Starting comprehensive role check');
        
        // Direct database check (most reliable)
        ('Performing direct database check for crypto role');
        const { data, error } = await supabase
          .from('users')
          .select('roles')
          .eq('id', user.id)
          .single();
          
        if (!error && data?.roles) {
          const hasCryptoRole = Array.isArray(data.roles) && data.roles.includes('crypto_investor');
          ('Database check result:', hasCryptoRole ? 'HAS CRYPTO ROLE' : 'NO CRYPTO ROLE');
          
          if (hasCryptoRole) {
            localStorage.setItem('cryptoInvestorSelected', 'true');
            setIsCryptoInvestor(true);
            roleCheckCompleted.current = true;
          }
        }
      } catch (err) {
        console.error('Error in role detection:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    detectCryptoInvestorRole();
  }, [user?.id, forceMode]);
  
  // Debug info
  useEffect(() => {
    if (isLoading) return;
    
    ('PropertyDetail rendering decision:');
    ('- isCryptoInvestor state:', isCryptoInvestor);
    ('- forceMode:', forceMode);
    ('- localStorage flag:', localStorage.getItem('cryptoInvestorSelected'));
    
    // Will render: Template type
    const templateType = 
      forceMode === 'crypto' || isCryptoInvestor || 
      localStorage.getItem('cryptoInvestorSelected') === 'true' ? 
      'CRYPTO' : 'STANDARD';
      
    ('⭐ Will render:', templateType, 'template');
  }, [isLoading, isCryptoInvestor, forceMode]);
  
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin h-10 w-10 border-4 border-blue-600 rounded-full border-t-transparent mx-auto"></div>
          <p className="text-center mt-4">Loading property view...</p>
        </div>
      </div>
    );
  }
  
  // IMPORTANT: Check all possible ways to determine the view
  const shouldShowCryptoView = 
    forceMode === 'crypto' || 
    isCryptoInvestor || 
    user?.roles?.includes('crypto_investor') ||
    getUserRole() === 'crypto_investor' ||
    localStorage.getItem('cryptoInvestorSelected') === 'true';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        {/* Debug info */}
        <div className="absolute top-4 left-4 text-xs text-gray-500">
          {shouldShowCryptoView ? '🔑 Crypto Investor View' : '👤 Standard View'}
        </div>
        
        <div className="p-6">
          {shouldShowCryptoView ? (
            <CryptoProperty propertyData={property} mlsData={null} />
          ) : (
            <ActiveProperty propertyData={property} mlsData={null} />
          )}
        </div>
      </div>
    </div>
  );
};

export default PropertyDetail;
