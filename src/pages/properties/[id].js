import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import PropertyView from '../../components/Property/PropertyView';
import { useAuth } from '../../context/auth-context';
import RoleSaver from '../../components/Profile/RoleSaver';
import { checkCryptoInvestorRole } from '../../utils/PropertyUtils';
import BuyerAgent from '../../components/Property/BuyerAgent';

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
          
          // Override agent information with static buyer agent
          if (propertyData) {
            propertyData.agent = {
              name: 'John Easter',
              brokerage: 'Pennington Lines',
              photo: '/default-agent.jpg',
              phone: '814-873-5810',
              email: 'easterjo106@yahoo.com'
            };
          }
          
          setProperty(propertyData);

          // Fetch MLS data if needed
          const mlsResponse = await fetch(`/api/mls/${id}`);
          const mlsData = await mlsResponse.json();
          
          // Override MLS agent info too if present
          if (mlsData) {
            mlsData.agent = {
              name: 'John Easter',
              brokerage: 'Pennington Lines',
              photo: '/default-agent.jpg',
              phone: '814-873-5810',
              email: 'easterjo106@yahoo.com'
            };
          }
          
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

  const handleBackToListings = () => {
    // Check if there's a stored search state in sessionStorage
    const searchState = sessionStorage.getItem('propertySearchState');
    const searchFilters = sessionStorage.getItem('propertySearchFilters');
    
    if (searchState || searchFilters) {
      // If we have stored search state, go back to search results
      const parsedState = searchState ? JSON.parse(searchState) : {};
      const parsedFilters = searchFilters ? JSON.parse(searchFilters) : {};
      
      // Build query string from stored filters
      const queryParams = new URLSearchParams();
      
      if (parsedFilters.priceMin) queryParams.set('priceMin', parsedFilters.priceMin);
      if (parsedFilters.priceMax) queryParams.set('priceMax', parsedFilters.priceMax);
      if (parsedFilters.bedrooms) queryParams.set('bedrooms', parsedFilters.bedrooms);
      if (parsedFilters.bathrooms) queryParams.set('bathrooms', parsedFilters.bathrooms);
      if (parsedFilters.propertyType) queryParams.set('propertyType', parsedFilters.propertyType);
      if (parsedFilters.location) queryParams.set('location', parsedFilters.location);
      if (parsedFilters.sqftMin) queryParams.set('sqftMin', parsedFilters.sqftMin);
      if (parsedFilters.sqftMax) queryParams.set('sqftMax', parsedFilters.sqftMax);
      if (parsedState.currentPage) queryParams.set('page', parsedState.currentPage);
      
      const queryString = queryParams.toString();
      const searchUrl = queryString ? `/search?${queryString}` : '/search';
      
      router.push(searchUrl);
    } else {
      // Fallback: try browser back first, then home page
      if (window.history.length > 1) {
        router.back();
      } else {
        router.push('/');
      }
    }
  };

  return (
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
          <>
            {/* Buyer Agent Section */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Your Buyer Agent</h2>
              <BuyerAgent />
            </div>
            
            <PropertyView propertyData={property} mlsData={mlsData} />
            
            {/* Back to Listings Button */}
            <div className="text-center mt-8">
              <button
                onClick={handleBackToListings}
                className="bg-gray-100 text-black py-2 px-6 rounded-lg border border-black hover:bg-gray-200 transition-colors"
              >
                ← Back to Listings
              </button>
            </div>
          </>
        )}
      </div>
  );
};

export default PropertyPage;