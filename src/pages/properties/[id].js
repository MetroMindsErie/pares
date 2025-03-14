import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import PropertyView from '../../components/Property/PropertyView';
import { useAuth } from '../../context/auth-context';
import RoleSaver from '../../components/Profile/RoleSaver';
import { checkCryptoInvestorRole } from '../../utils/PropertyUtils';

const PropertyPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user, getUserRole, refreshUserData } = useAuth();
  const [property, setProperty] = useState(null);
  const [mlsData, setMlsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCryptoInvestor, setIsCryptoInvestor] = useState(false);

  // Make sure we detect crypto investor role correctly
  useEffect(() => {
    const verifyUserRole = async () => {
      if (!user?.id) return;
      
      try {
        // First refresh user data to ensure we have latest roles
        await refreshUserData(user.id);
        
        // Check for crypto_investor role multiple ways
        const contextRole = getUserRole();
        const hasRoleInArray = Array.isArray(user.roles) && user.roles.includes('crypto_investor');
        const hasRoleInDatabase = await checkCryptoInvestorRole(user.id);
        const hasRoleInLocalStorage = localStorage.getItem('cryptoInvestorSelected') === 'true';
        
        console.log('Property Page - Crypto Investor Role Check Results:');
        console.log('- From getUserRole():', contextRole === 'crypto_investor');
        console.log('- From user.roles array:', hasRoleInArray);
        console.log('- From direct DB check:', hasRoleInDatabase);
        console.log('- From localStorage flag:', hasRoleInLocalStorage);
        
        // Set flag if any method detects the role
        const hasCryptoInvestorRole = contextRole === 'crypto_investor' || 
          hasRoleInArray || 
          hasRoleInDatabase || 
          hasRoleInLocalStorage;
          
        setIsCryptoInvestor(hasCryptoInvestorRole);
        
        if (hasCryptoInvestorRole) {
          console.log('🎉 CONFIRMED: User has crypto_investor role');
          
          // Force the crypto flag in localStorage to ensure other components see it
          localStorage.setItem('cryptoInvestorSelected', 'true');
        } else {
          console.log('User does not have crypto_investor role');
        }
      } catch (err) {
        console.error('Error verifying user role:', err);
      }
    };
    
    verifyUserRole();
  }, [user?.id, getUserRole, refreshUserData]);

  useEffect(() => {
    if (id) {
      // Fetch property data based on the ID
      const fetchPropertyData = async () => {
        try {
          setLoading(true);
          // Replace with your actual API call to fetch property data
          const propertyResponse = await fetch(`/api/properties/${id}`);
          const propertyData = await propertyResponse.json();
          setProperty(propertyData);

          // Fetch MLS data if needed
          const mlsResponse = await fetch(`/api/mls/${id}`);
          const mlsData = await mlsResponse.json();
          setMlsData(mlsData);
        } catch (err) {
          setError('Failed to load property data.');
        } finally {
          setLoading(false);
        }
      };

      fetchPropertyData();
    }
  }, [id]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Add role debug info */}
        {user && (
          <div className="hidden">
            Role status: {isCryptoInvestor ? 'Crypto Investor' : 'Regular User'}
          </div>
        )}
        
        {/* Force refresh user role before rendering */}
        {user?.id && <RoleSaver />}
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="text-center text-red-500">{error}</div>
        ) : (
          <PropertyView propertyData={property} mlsData={mlsData} />
        )}
      </div>
    </Layout>
  );
};

export default PropertyPage;