import { useState, useEffect, useRef } from 'react';
import { getPropertiesByFilter } from '../../src/services/trestleServices';

const COUNTY_STYLES = {
  '42049': { 
    name: 'Erie', 
    color: '#0000FF',
    details: {
      population: 269728,
      medianHomePrice: '$160,000',
      averageIncomePerHousehold: '$53,000',
      description: 'Erie County is located in the northwestern corner of Pennsylvania, bordering Lake Erie. It offers affordable housing and quality education options.'
    } 
  },
  '42121': { 
    name: 'Warren', 
    color: '#FFFF00',
    details: {
      population: 39191,
      medianHomePrice: '$125,000',
      averageIncomePerHousehold: '$49,500',
      description: 'Warren County is situated in northwestern Pennsylvania and is known for its beautiful natural scenery, outdoor recreation opportunities, and small-town atmosphere.'
    }
  },
  '42039': { 
    name: 'Crawford', 
    color: '#800080',
    details: {
      population: 84629,
      medianHomePrice: '$140,000',
      averageIncomePerHousehold: '$51,000',
      description: 'Crawford County is located in northwestern Pennsylvania and is home to several historical towns, lakes, and recreational areas. It offers a mix of rural and small urban living environments.'
    }
  }
};

const CountyDetails = ({ countyId }) => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('active');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevPropertiesRef = useRef([]);
  
  useEffect(() => {
    const fetchProperties = async () => {
      if (!countyId) return;
      
      setIsTransitioning(true);
      setLoading(true);
      
      try {
        const countyName = COUNTY_STYLES[countyId].name;
        console.log(`Fetching ${status} properties for ${countyName} County`);
        const filter = `$filter=CountyOrParish eq '${countyName}' and StandardStatus eq '${status === 'active' ? 'Active' : 'Closed'}' and PropertyType eq 'Residential'`;
        
        try {
          const response = await getPropertiesByFilter(filter);
          if (response && response.properties) {
            console.log(`Successfully loaded ${response.properties.length} properties`);
            
            // Store current properties as previous before updating
            prevPropertiesRef.current = properties;
            
            // Small delay to ensure smooth transition
            setTimeout(() => {
              setProperties(response.properties);
              setLoading(false);
              // Small additional delay before removing transition effect
              setTimeout(() => setIsTransitioning(false), 100);
            }, 100);
          } else {
            throw new Error('No properties returned');
          }
        } catch (apiErr) {
          console.error('Failed to fetch properties:', apiErr);
          setError('Unable to load properties from service');
          
          // Set demo properties with smoother transition
          setTimeout(() => {
            setProperties(Array(5).fill().map((_, i) => ({
              ListingKey: `demo-${i}`,
              UnparsedAddress: `${i+100} Main St, ${COUNTY_STYLES[countyId].name}, PA`,
              ListPrice: 350000 + (i * 50000),
              BedroomsTotal: 3,
              BathroomsTotalInteger: 2,
              LivingArea: 2000,
              media: '/properties.jpg'
            })));
            setLoading(false);
            setTimeout(() => setIsTransitioning(false), 100);
          }, 100);
        }
      } catch (err) {
        console.error('Error in property fetch flow:', err);
        setError('Unable to load properties');
        
        // Set demo properties with smoother transition
        setTimeout(() => {
          setProperties(Array(5).fill().map((_, i) => ({
            ListingKey: `demo-${i}`,
            UnparsedAddress: `${i+100} Main St, ${COUNTY_STYLES[countyId]?.name || 'Unknown'}, PA`,
            ListPrice: 350000 + (i * 50000),
            BedroomsTotal: 3,
            BathroomsTotalInteger: 2,
            LivingArea: 2000,
            media: '/properties.jpg'
          })));
          setLoading(false);
          setTimeout(() => setIsTransitioning(false), 100);
        }, 100);
      }
    };
    
    fetchProperties();
  }, [countyId, status]);

  // Add debug output to see if component is rendering
  console.log(`CountyDetails rendering for county ${countyId}, loading: ${loading}, properties: ${properties.length}`);
  
  if (!countyId || !COUNTY_STYLES[countyId]) return null;
  
  const county = COUNTY_STYLES[countyId];
  
  return (
    <div className={`p-6 transition-opacity duration-300 ${isTransitioning ? 'opacity-80' : 'opacity-100'}`}>
      <div className="mb-8 border-b border-gray-200 pb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center">
          <span className="w-4 h-4 rounded-full mr-2" style={{backgroundColor: county.color}}></span>
          {county.name} County
        </h2>
        <p className="text-gray-600 mb-6">{county.details.description}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl shadow-sm">
            <h3 className="text-sm font-medium text-blue-800 uppercase tracking-wide mb-2">Population</h3>
            <p className="text-2xl font-bold text-gray-800">{county.details.population.toLocaleString()}</p>
          </div>
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-5 rounded-xl shadow-sm">
            <h3 className="text-sm font-medium text-indigo-800 uppercase tracking-wide mb-2">Median Home Price</h3>
            <p className="text-2xl font-bold text-gray-800">{county.details.medianHomePrice}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-xl shadow-sm">
            <h3 className="text-sm font-medium text-purple-800 uppercase tracking-wide mb-2">Average Income</h3>
            <p className="text-2xl font-bold text-gray-800">{county.details.averageIncomePerHousehold}</p>
          </div>
        </div>
      </div>

      <div className="mt-8">
        {/* Properties section */}
        <div className="flex flex-wrap items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-2 sm:mb-0">
            Real Estate Listings
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({properties.length} {status === 'active' ? 'active' : 'closed'} listings)
            </span>
          </h3>
          <div className="flex gap-3">
            <button
              onClick={() => setStatus('active')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                status === 'active' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Active Listings
            </button>
            <button
              onClick={() => setStatus('closed')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                status === 'closed' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Closed Listings
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden h-[350px]">
                <div className="h-48 bg-gray-200"></div>
                <div className="p-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <div className="h-6 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="mx-4 mb-6 p-3 bg-yellow-50 border border-yellow-300 rounded-md text-sm">
            <p className="text-yellow-800">
              <span className="font-medium">Note:</span> {error}
            </p>
          </div>
        ) : (
          <>
            {properties.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map(property => (
                  <div 
                    key={property.ListingKey} 
                    className="property-card bg-white rounded-xl shadow-md overflow-hidden"
                  >
                    <div className="relative h-48">
                      <img
                        src={property.media || "/properties.jpg"}
                        alt={property.UnparsedAddress}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                        <p className="text-xl font-bold text-white">
                          ${property.ListPrice?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-gray-600 truncate">{property.UnparsedAddress}</p>
                      <div className="mt-3 flex items-center justify-between text-sm">
                        <div className="flex gap-4">
                          <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                            </svg>
                            <span>{property.BedroomsTotal || 'N/A'} bd</span>
                          </div>
                          <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{property.BathroomsTotalInteger || 'N/A'} ba</span>
                          </div>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                          </svg>
                          <span>{property.LivingArea?.toLocaleString() || 'N/A'} sqft</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <p className="text-gray-600 font-medium">No properties found in this county.</p>
                <p className="text-gray-500 text-sm mt-1">Try switching to {status === 'active' ? 'closed' : 'active'} listings.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CountyDetails;
