import { useState, useEffect, useRef } from 'react';
import { geoCentroid } from 'd3-geo';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from 'react-simple-maps';
import { useRouter } from 'next/router';
import { getPropertiesByFilter, getNextProperties } from './src/services/trestleServices';
import ReactDOM from 'react-dom';

// More accurate center point for Pennsylvania
const PENNSYLVANIA_CENTER = [-77.85, 40.95];

const COUNTY_STYLES = {
  '42049': { 
    name: 'Erie', 
    color: '#0000FF', 
    hoverColor: '#0000CC',
    details: {
      population: 269728,
      medianHomePrice: '$160,000',
      averageIncomePerHousehold: '$53,000',
      neighborhoods: [
        { name: 'Downtown Erie', heatIndex: 0.8 },
        { name: 'Millcreek', heatIndex: 0.9 },
        { name: 'Harborcreek', heatIndex: 0.7 },
        { name: 'Fairview', heatIndex: 0.75 }
      ],
      description: 'Erie County is located in the northwestern corner of Pennsylvania, bordering Lake Erie. It offers affordable housing and quality education options.'
    } 
  },
  '42121': { 
    name: 'Warren', 
    color: '#FFFF00', 
    hoverColor: '#CCCC00',
    details: {
      population: 39191,
      medianHomePrice: '$125,000',
      averageIncomePerHousehold: '$49,500',
      neighborhoods: [
        { name: 'Warren City', heatIndex: 0.6 },
        { name: 'Youngsville', heatIndex: 0.5 },
        { name: 'Sheffield', heatIndex: 0.4 },
        { name: 'Pleasant Township', heatIndex: 0.45 }
      ],
      description: 'Warren County is situated in northwestern Pennsylvania and is known for its beautiful natural scenery, outdoor recreation opportunities, and small-town atmosphere.'
    }
  },
  '42039': { 
    name: 'Crawford', 
    color: '#800080', 
    hoverColor: '#660066',
    details: {
      population: 84629,
      medianHomePrice: '$140,000',
      averageIncomePerHousehold: '$51,000',
      neighborhoods: [
        { name: 'Meadville', heatIndex: 0.7 },
        { name: 'Titusville', heatIndex: 0.6 },
        { name: 'Conneaut Lake', heatIndex: 0.75 },
        { name: 'Cambridge Springs', heatIndex: 0.65 }
      ],
      description: 'Crawford County is located in northwestern Pennsylvania and is home to several historical towns, lakes, and recreational areas. It offers a mix of rural and small urban living environments.'
    }
  }
};

const DEFAULT_FILL = '#E2E8F0';
const STATE_STROKE = '#0000FF';

// Mobile County Selector Component
const MobileCountySelector = ({ onCountySelected }) => {
  const selectCounty = (countyFips) => {
    if (onCountySelected) {
      onCountySelected(countyFips);
    }
  };

  return (
    <div className="mobile-county-selector py-6 px-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Select a County</h3>
      <div className="grid grid-cols-1 gap-3">
        {Object.entries(COUNTY_STYLES).map(([fips, county]) => (
          <button
            key={fips}
            onClick={() => selectCounty(fips)}
            className="flex items-center p-4 border rounded-lg transition-all hover:border-blue-500 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ borderColor: county.color }}
          >
            <span 
              className="w-6 h-6 rounded-full mr-3" 
              style={{ backgroundColor: county.color }}
            ></span>
            <div className="text-left">
              <p className="font-medium text-gray-800">{county.name} County</p>
              <p className="text-sm text-gray-500">
                Population: {county.details.population.toLocaleString()}
              </p>
            </div>
            <div className="ml-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// Property Loading Skeleton Component
const PropertyLoadingSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden">
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
);

// Add Pagination Component
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      // Show all pages if total is less than max to show
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always include first page
      pageNumbers.push(1);
      
      // Calculate range around current page
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);
      
      // Add ellipsis after first page if needed
      if (startPage > 2) {
        pageNumbers.push('...');
      }
      
      // Add pages around current page
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
      
      // Add ellipsis before last page if needed
      if (endPage < totalPages - 1) {
        pageNumbers.push('...');
      }
      
      // Always include last page
      pageNumbers.push(totalPages);
    }
    
    return pageNumbers;
  };
  
  return (
    <div className="flex justify-center mt-8">
      <div className="flex items-center space-x-2">
        <button 
          className={`w-9 h-9 flex items-center justify-center rounded-full border ${
            currentPage === 1 
              ? 'border-gray-200 text-gray-400 cursor-not-allowed'
              : 'border-blue-500 text-blue-500 hover:bg-blue-50'
          }`}
          onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
        
        {renderPageNumbers().map((page, index) => (
          page === '...' ? (
            <span key={`ellipsis-${index}`} className="mx-1 text-gray-500">...</span>
          ) : (
            <button
              key={page}
              className={`w-9 h-9 flex items-center justify-center rounded-full ${
                currentPage === page
                  ? 'bg-blue-500 text-white'
                  : 'border border-gray-300 hover:border-blue-500 hover:text-blue-500'
              }`}
              onClick={() => page !== currentPage && onPageChange(page)}
              data-page={page}
            >
              {page}
            </button>
          )
        ))}
        
        <button 
          className={`w-9 h-9 flex items-center justify-center rounded-full border ${
            currentPage === totalPages 
              ? 'border-gray-200 text-gray-400 cursor-not-allowed'
              : 'border-blue-500 text-blue-500 hover:bg-blue-50'
          }`}
          onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
};

const InteractiveRealEstateMap = ({ onInteraction, onCountySelected }) => {
  const [geoData, setGeoData] = useState(null);
  const [selectedCounty, setSelectedCounty] = useState(null);
  const [tooltipContent, setTooltipContent] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [propertiesByCounty, setPropertiesByCounty] = useState({});
  const [selectedStatus, setSelectedStatus] = useState('active');
  const [nextLink, setNextLink] = useState(null);
  const router = useRouter();
  const [mapLoaded, setMapLoaded] = useState(false);
  const countyDetailsRef = useRef(null);
  const [initialViewCompleted, setInitialViewCompleted] = useState(false);
  const detailsContainerRef = useRef(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [propertiesPerPage, setPropertiesPerPage] = useState(9); // Changed to 9 per page
  const [totalPages, setTotalPages] = useState(1);
  const [allProperties, setAllProperties] = useState({});

  // Detect mobile view
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    return () => window.removeEventListener('resize', checkMobileView);
  }, []);

  // Fetch properties when a county is selected.
  useEffect(() => {
    const fetchProperties = async () => {
      if (selectedCounty) {
        setLoading(true);
        setIsTransitioning(true); // Start transition
        try {
          const countyName = COUNTY_STYLES[selectedCounty].name;
          
          // Use standard filter format to ensure consistent response
          const filter = `$filter=CountyOrParish eq '${countyName}' and StandardStatus eq '${selectedStatus === 'active' ? 'Active' : 'Closed'}' and PropertyType eq 'Residential'`;
          
          try {
            const response = await getPropertiesByFilter(filter);
            
            // Ensure we're actually getting properties back
            if (response && response.properties) {
              // Set current page to 1 when changing county or status
              setCurrentPage(1);
              
              // Store all properties in allProperties state
              const updatedAllProperties = {
                ...allProperties,
                [selectedCounty]: {
                  ...allProperties[selectedCounty],
                  [selectedStatus]: response.properties
                }
              };
              setAllProperties(updatedAllProperties);
              
              // Calculate total pages
              const newTotalPages = Math.ceil(response.properties.length / propertiesPerPage);
              setTotalPages(newTotalPages);
              
              // Get paginated properties for the first page
              const paginatedProperties = response.properties.slice(0, propertiesPerPage);
              
              // Small delay to allow transition to complete
              setTimeout(() => {
                setPropertiesByCounty(prev => ({
                  ...prev,
                  [selectedCounty]: { 
                    ...prev[selectedCounty],
                    [selectedStatus]: paginatedProperties 
                  }
                }));
                setNextLink(response.nextLink);
                setLoading(false);
                // End transition after data is set
                setTimeout(() => setIsTransitioning(false), 100);
              }, 100);
            } else {
              throw new Error('No properties returned from API');
            }
          } catch (err) {
            console.error('Failed to fetch properties from Trestle API:', err);
            
            // Use demo data when API fails
            const getDemoProperties = (count) => {
              return Array(count).fill().map((_, i) => ({
                ListingKey: `demo-${countyName}-${i}`,
                UnparsedAddress: `${100 + i} Main St, ${countyName}, PA`,
                ListPrice: Math.round(250000 + Math.random() * 500000),
                BedroomsTotal: Math.floor(2 + Math.random() * 4),
                BathroomsTotalInteger: Math.floor(1 + Math.random() * 3),
                LivingArea: Math.floor(1000 + Math.random() * 2000),
                media: '/properties.jpg',
                demoProperty: true
              }));
            };
            
            // Generate a larger set of demo properties for pagination
            const demoProperties = getDemoProperties(18);
            
            // Store all demo properties
            setAllProperties(prev => ({
              ...prev,
              [selectedCounty]: { 
                ...prev[selectedCounty],
                [selectedStatus]: demoProperties 
              }
            }));
            
            // Calculate total pages for demo data
            const newTotalPages = Math.ceil(demoProperties.length / propertiesPerPage);
            setTotalPages(newTotalPages);
            
            // Only display the first page of properties
            setPropertiesByCounty(prev => ({
              ...prev,
              [selectedCounty]: { 
                ...prev[selectedCounty],
                [selectedStatus]: demoProperties.slice(0, propertiesPerPage) 
              }
            }));
            
            setError('Using demo data - property service unavailable');
            setLoading(false);
            setTimeout(() => setIsTransitioning(false), 100);
          }
        } catch (err) {
          console.error('Error in fetch properties flow:', err);
          setError('Failed to load properties - using demo data');
          
          // Always provide demo data as fallback
          const countyName = COUNTY_STYLES[selectedCounty]?.name || 'Unknown';
          const demoProperties = Array(15).fill().map((_, i) => ({
            ListingKey: `demo-${i}`,
            UnparsedAddress: `${i+100} Demo St, ${countyName}, PA`,
            ListPrice: 350000 + (i * 50000),
            BedroomsTotal: 3,
            BathroomsTotalInteger: 2,
            LivingArea: 2000,
            media: '/properties.jpg',
            demoProperty: true
          }));
          
          // Store all demo properties
          setAllProperties(prev => ({
            ...prev,
            [selectedCounty]: { 
              ...prev[selectedCounty],
              [selectedStatus]: demoProperties 
            }
          }));
          
          // Calculate total pages for demo data
          const newTotalPages = Math.ceil(demoProperties.length / propertiesPerPage);
          setTotalPages(newTotalPages);
          
          // Only display the first page of properties
          setPropertiesByCounty(prev => ({
            ...prev,
            [selectedCounty]: { 
              ...prev[selectedCounty],
              [selectedStatus]: demoProperties.slice(0, propertiesPerPage) 
            }
          }));
          
          setLoading(false);
          setTimeout(() => setIsTransitioning(false), 100);
        }
      }
    };
    
    // Fetch properties when county or status changes
    fetchProperties();
  }, [selectedCounty, selectedStatus]);

  // Add this useEffect to trigger UI updates when properties are loaded
  useEffect(() => {
    // When properties are loaded for the selected county, update the UI
    if (selectedCounty && 
        propertiesByCounty[selectedCounty]?.[selectedStatus] && 
        !loading) {
      console.log("Properties loaded, updating UI...");
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => updateCountyDetailsInDom(), 50);
    }
  }, [selectedCounty, propertiesByCounty, selectedStatus, loading]);

  // Modify the updateCountyDetailsInDom function for better error handling
  const updateCountyDetailsInDom = () => {
    if (!selectedCounty || typeof window === 'undefined') return;
    
    const countyDetailsContainer = document.getElementById('county-details-container');
    if (!countyDetailsContainer) {
      console.error("County details container not found in DOM");
      return;
    }
    
    const county = COUNTY_STYLES[selectedCounty];
    const properties = propertiesByCounty[selectedCounty]?.[selectedStatus] || [];
    const totalPropertiesCount = allProperties[selectedCounty]?.[selectedStatus]?.length || 0;
    
    console.log("Updating DOM with properties:", properties.length);
    
    // Create county details HTML
    const countyDetailsHTML = `
      <div class="p-6 county-details fade-in" data-county="${county.name}">
        <div class="mb-8 border-b border-gray-200 pb-6">
          <h2 class="text-2xl font-bold text-gray-800 mb-2 flex items-center">
            <span class="w-4 h-4 rounded-full mr-2" style="background-color: ${county.color}"></span>
            ${county.name} County
          </h2>
          <p class="text-gray-600 mb-6">${county.details.description}</p>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl shadow-sm slide-in animate-delay-100">
              <h3 class="text-sm font-medium text-blue-800 uppercase tracking-wide mb-2">Population</h3>
              <p class="text-2xl font-bold text-gray-800">${county.details.population.toLocaleString()}</p>
            </div>
            <div class="bg-gradient-to-br from-indigo-50 to-indigo-100 p-5 rounded-xl shadow-sm slide-in animate-delay-200">
              <h3 class="text-sm font-medium text-indigo-800 uppercase tracking-wide mb-2">Median Home Price</h3>
              <p class="text-2xl font-bold text-gray-800">${county.details.medianHomePrice}</p>
            </div>
            <div class="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-xl shadow-sm slide-in animate-delay-300">
              <h3 class="text-sm font-medium text-purple-800 uppercase tracking-wide mb-2">Average Income</h3>
              <p class="text-2xl font-bold text-gray-800">${county.details.averageIncomePerHousehold}</p>
            </div>
          </div>
        </div>
        
        <div class="mt-8">
          <div class="flex flex-wrap items-center justify-between mb-6">
            <h3 class="text-xl font-bold text-gray-800 mb-2 sm:mb-0">
              Available Properties 
              <span class="ml-2 text-sm font-normal text-gray-500">
                (${properties.length} ${selectedStatus === 'active' ? 'active' : 'closed'} listings)
              </span>
            </h3>
            <div class="flex gap-3">
              <button id="active-listings-btn"
                class="px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedStatus === 'active' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }"
              >
                Active Listings
              </button>
              <button id="closed-listings-btn"
                class="px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedStatus === 'closed' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }"
              >
                Closed Listings
              </button>
            </div>
          </div>
          
          ${loading ? `
            <div class="flex justify-center p-12">
              <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ` : ''}
          
          ${error ? `
            <div class="mx-4 mb-6 p-3 bg-yellow-50 border border-yellow-300 rounded-md text-sm">
              <p class="text-yellow-800">
                <span class="font-medium">Note:</span> ${error}
              </p>
            </div>
          ` : ''}
          
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 property-grid">
            ${properties.map(property => `
              <div 
                class="bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1 cursor-pointer property-card"
                data-property-id="${property.ListingKey}"
              >
                <div class="relative h-48">
                  <img
                    src="${property.media || '/properties.jpg'}"
                    alt="${property.UnparsedAddress || 'Property'}"
                    class="w-full h-full object-cover"
                  />
                  <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                    <p class="text-xl font-bold text-white">
                      $${(property.ListPrice || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div class="p-4">
                  <p class="text-sm text-gray-600 truncate">${property.UnparsedAddress || 'Address unavailable'}</p>
                  <div class="mt-3 flex items-center justify-between text-sm">
                    <div class="flex gap-4">
                      <div class="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-blue-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                        <span>${property.BedroomsTotal || 'N/A'} bd</span>
                      </div>
                      <div class="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-blue-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>${property.BathroomsTotalInteger || 'N/A'} ba</span>
                      </div>
                    </div>
                    <div class="flex items-center text-gray-600">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                      </svg>
                      <span>${property.LivingArea ? property.LivingArea.toLocaleString() : 'N/A'} sqft</span>
                    </div>
                  </div>
                  <div class="mt-4 pt-3 border-t border-gray-100">
                    <button class="w-full text-blue-600 text-sm font-medium hover:text-blue-800 transition-colors">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
  
          ${properties.length === 0 && !loading ? `
            <div class="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <p class="text-gray-600 font-medium">No properties found in this county matching your criteria.</p>
              <p class="text-gray-500 text-sm mt-1">Try changing your search parameters or exploring a different county.</p>
            </div>
          ` : ''}
          
          ${totalPropertiesCount > propertiesPerPage ? renderPaginationHTML() : ''}
          
          ${nextLink ? `
            <div class="mt-8 flex justify-center">
              <button
                id="load-more-btn"
                class="px-6 py-3 bg-white border border-blue-600 text-blue-600 rounded-full hover:bg-blue-50 transition-colors flex items-center gap-2 font-medium"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
                Load More Properties
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
    
    // Find or create the content container
    let contentDiv = countyDetailsContainer.querySelector('.county-details-content');
    if (!contentDiv) {
      contentDiv = document.createElement('div');
      contentDiv.className = 'county-details-content';
      countyDetailsContainer.appendChild(contentDiv);
    }
    
    // Update content
    contentDiv.innerHTML = countyDetailsHTML;
    
    // Add click handlers after updating the DOM
    setupEventListeners(contentDiv);
  };
  
  // Set up event listeners for the county details section
  const setupEventListeners = (containerElement) => {
    // Add event listeners to toggle buttons
    const activeBtn = containerElement.querySelector('#active-listings-btn');
    const closedBtn = containerElement.querySelector('#closed-listings-btn');
    
    if (activeBtn) {
      activeBtn.addEventListener('click', () => {
        setSelectedStatus('active');
      });
    }
    
    if (closedBtn) {
      closedBtn.addEventListener('click', () => {
        setSelectedStatus('closed');
      });
    }
    
    // Add event listeners to property cards
    containerElement.querySelectorAll('.property-card').forEach(card => {
      card.addEventListener('click', () => {
        const propertyId = card.getAttribute('data-property-id');
        if (propertyId) {
          handlePropertyClick(propertyId);
        }
      });
    });

    // Add event listener to the load more button
    const loadMoreBtn = containerElement.querySelector('#load-more-btn');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', loadMoreProperties);
    }
    
    // Add event listeners to pagination buttons
    containerElement.querySelectorAll('.page-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const pageNum = parseInt(btn.getAttribute('data-page'), 10);
        if (!isNaN(pageNum) && pageNum !== currentPage) {
          changePage(pageNum);
        }
      });
    });
  };

  const loadMoreProperties = async () => {
    if (nextLink) {
      setLoading(true);
      setError(null);
      try {
        const { properties, nextLink: newNextLink } = await getNextProperties(nextLink);

        // Initialize allProperties for this county and status if needed
        const currentAllProperties = allProperties[selectedCounty]?.[selectedStatus] || 
          propertiesByCounty[selectedCounty]?.[selectedStatus] || [];
        
        // Update all properties first
        const updatedAllProperties = {
          ...allProperties,
          [selectedCounty]: {
            ...allProperties[selectedCounty],
            [selectedStatus]: [
              ...currentAllProperties,
              ...properties
            ]
          }
        };
        
        setAllProperties(updatedAllProperties);
        
        // Calculate new total pages
        const totalPropertiesCount = updatedAllProperties[selectedCounty][selectedStatus].length;
        const newTotalPages = Math.ceil(totalPropertiesCount / propertiesPerPage);
        setTotalPages(newTotalPages);
        
        // Update next link
        setNextLink(newNextLink);
        
        // If on the last page, update the displayed properties to include new items
        if (currentPage === totalPages) {
          const startIndex = (currentPage - 1) * propertiesPerPage;
          const paginatedProperties = updatedAllProperties[selectedCounty][selectedStatus].slice(
            startIndex, 
            startIndex + propertiesPerPage
          );
          
          setPropertiesByCounty(prev => ({
            ...prev,
            [selectedCounty]: {
              ...prev[selectedCounty],
              [selectedStatus]: paginatedProperties
            }
          }));
        }
        
        setLoading(false);
      } catch (err) {
        setError('Failed to load more properties');
        console.error(err);
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetch('/pa_counties.json')
      .then(response => response.json())
      .then(data => {
        const paData = {
          ...data,
          features: data.features.filter(feature => feature.properties.STATE === '42')
        };
        setGeoData(paData);
      });

    // Add a small delay to trigger animation after map loads
    const timer = setTimeout(() => {
      setMapLoaded(true);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Scroll to county details when a county is selected
    if (selectedCounty && countyDetailsRef.current) {
      countyDetailsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedCounty]);

  // Add a new effect to handle county selection notification
  useEffect(() => {
    // When a county is selected, notify the parent component
    if (selectedCounty && onCountySelected) {
      onCountySelected(selectedCounty);
      console.log("County selected:", selectedCounty);
    }
  }, [selectedCounty, onCountySelected]);

  // Update the county selection handler to use the imported ReactDOM
  const handleCountyClick = (countyFips) => {
    console.log("County clicked:", countyFips);
    
    // If the county is already selected, don't reselect it
    if (selectedCounty === countyFips) return;
    
    // Set loading state immediately
    setLoading(true);
    
    // Update the selected county which will trigger the useEffect
    setSelectedCounty(countyFips);
    
    // Notify parent components of the selection
    if (onInteraction) onInteraction();
    if (onCountySelected) {
      console.log("Notifying parent of county selection:", countyFips);
      onCountySelected(countyFips);
    }
    
    // Show loading screen immediately with smooth transition
    const countyDetailsContainer = document.getElementById('county-details-container');
    if (countyDetailsContainer) {
      // Get county data for the loading screen
      const county = COUNTY_STYLES[countyFips];
      
      const loadingHTML = `
        <div class="county-details-loading p-6 fade-in">
          <div class="mb-8 border-b border-gray-100 pb-6">
            <div class="flex items-center mb-2">
              <div class="w-4 h-4 rounded-full mr-2" style="background-color: ${county.color}"></div>
              <h2 class="text-2xl font-bold text-gray-800">${county.name} County</h2>
            </div>
            
            <!-- Improved skeleton loading for description -->
            <div class="space-y-2">
              <div class="animate-pulse bg-gray-200 h-4 rounded w-3/4"></div>
              <div class="animate-pulse bg-gray-200 h-4 rounded w-full"></div>
              <div class="animate-pulse bg-gray-200 h-4 rounded w-2/3 mb-6"></div>
            </div>
            
            <!-- Improved skeleton loading for stats cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div class="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-xl shadow-sm">
                <h3 class="text-sm font-medium text-gray-400 uppercase tracking-wide mb-2">Population</h3>
                <div class="animate-pulse bg-gray-200 h-8 rounded w-1/2"></div>
              </div>
              <div class="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-xl shadow-sm">
                <h3 class="text-sm font-medium text-gray-400 uppercase tracking-wide mb-2">Median Home Price</h3>
                <div class="animate-pulse bg-gray-200 h-8 rounded w-1/2"></div>
              </div>
              <div class="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-xl shadow-sm">
                <h3 class="text-sm font-medium text-gray-400 uppercase tracking-wide mb-2">Average Income</h3>
                <div class="animate-pulse bg-gray-200 h-8 rounded w-1/2"></div>
              </div>
            </div>
          </div>
          
          <!-- Property loading section with improved skeleton UI -->
          <div class="mt-8">
            <div class="flex flex-wrap items-center justify-between mb-6">
              <div class="animate-pulse bg-gray-200 h-6 rounded w-48 mb-2"></div>
              <div class="flex gap-3">
                <div class="w-24 h-10 rounded-full bg-gray-200 animate-pulse"></div>
                <div class="w-24 h-10 rounded-full bg-gray-200 animate-pulse"></div>
              </div>
            </div>
            
            <!-- Improved property card skeletons -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              ${Array(6).fill().map(() => `
                <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div class="relative h-48 bg-gray-200 animate-pulse"></div>
                  <div class="p-4">
                    <div class="animate-pulse bg-gray-200 h-4 rounded w-3/4 mb-3"></div>
                    <div class="mt-3 flex items-center justify-between">
                      <div class="flex gap-4">
                        <div class="w-12 h-4 bg-gray-200 rounded animate-pulse"></div>
                        <div class="w-12 h-4 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                      <div class="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <div class="mt-4 pt-3 border-t border-gray-100">
                      <div class="w-full h-6 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
      
      // Find the content container
      let contentDiv = countyDetailsContainer.querySelector('.county-details-content');
      if (!contentDiv) {
        contentDiv = document.createElement('div');
        contentDiv.className = 'county-details-content';
        countyDetailsContainer.appendChild(contentDiv);
      }
      
      // Set loading content with improved skeleton UI
      contentDiv.innerHTML = loadingHTML;
    }
  };

  const handlePropertyClick = (propertyId) => {
    console.log(`Property clicked: ${propertyId}`);
    if (onInteraction) onInteraction();
    // Navigate to property details page
    router.push(`/property/${propertyId}`);
  };

  // Render the county details
  const renderCountyDetails = () => {
    if (!selectedCounty) return null;
    
    const county = COUNTY_STYLES[selectedCounty];
    const properties = propertiesByCounty[selectedCounty]?.[selectedStatus] || [];
    const totalPropertiesCount = allProperties[selectedCounty]?.[selectedStatus]?.length || 0;
    
    return (
      <div className="p-6 county-details" data-county={county.name}>
        <div className="mb-8 border-b border-gray-200 pb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center">
            <span className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: county.color }}></span>
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
          <div className="flex flex-wrap items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-2 sm:mb-0">
              Available Properties 
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({properties.length} {selectedStatus === 'active' ? 'active' : 'closed'} listings)
              </span>
            </h3>
            <div className="flex gap-3">
              <button
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedStatus === 'active' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => setSelectedStatus('active')}
              >
                Active Listings
              </button>
              <button
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedStatus === 'closed' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => setSelectedStatus('closed')}
              >
                Closed Listings
              </button>
            </div>
          </div>
          
          {loading && (
            <div className="flex justify-center p-12">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}
          
          {error && (
            <div className="mx-4 mb-6 p-3 bg-yellow-50 border border-yellow-300 rounded-md text-sm">
              <p className="text-yellow-800">
                <span className="font-medium">Note:</span> {error}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map(property => (
              <div 
                key={property.ListingKey} 
                className="bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1 cursor-pointer"
                onClick={() => handlePropertyClick(property.ListingKey)}
              >
                <div className="relative h-48">
                  <img
                    src={property.media || '/properties.jpg'}
                    alt={property.UnparsedAddress || 'Property'}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                    <p className="text-xl font-bold text-white">
                      ${(property.ListPrice || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-600 truncate">{property.UnparsedAddress || 'Address unavailable'}</p>
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
                      <span>{property.LivingArea ? property.LivingArea.toLocaleString() : 'N/A'} sqft</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <button className="w-full text-blue-600 text-sm font-medium hover:text-blue-800 transition-colors">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
  
          {properties.length === 0 && !loading && (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <p className="text-gray-600 font-medium">No properties found in this county matching your criteria.</p>
              <p className="text-gray-500 text-sm mt-1">Try changing your search parameters or exploring a different county.</p>
            </div>
          )}
          
          {totalPropertiesCount > propertiesPerPage && !loading && (
            <Pagination 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={changePage}
            />
          )}
          
          {nextLink && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={loadMoreProperties}
                className="px-6 py-3 bg-white border border-blue-600 text-blue-600 rounded-full hover:bg-blue-50 transition-colors flex items-center gap-2 font-medium"
                disabled={loading}
              >
                {loading ? (
                  <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-600 mr-1"></span>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
                {loading ? 'Loading...' : 'Load More Properties'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Add this function to render pagination HTML for DOM updates
  const renderPaginationHTML = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      // Show all pages if total is less than max to show
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always include first page
      pageNumbers.push(1);
      
      // Calculate range around current page
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);
      
      // Add ellipsis after first page if needed
      if (startPage > 2) {
        pageNumbers.push('...');
      }
      
      // Add pages around current page
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
      
      // Add ellipsis before last page if needed
      if (endPage < totalPages - 1) {
        pageNumbers.push('...');
      }
      
      // Always include last page
      pageNumbers.push(totalPages);
    }

    return `
      <div class="flex justify-center mt-8">
        <div class="flex items-center space-x-2">
          <button 
            class="w-9 h-9 flex items-center justify-center rounded-full border ${
              currentPage === 1 
                ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                : 'border-blue-500 text-blue-500 hover:bg-blue-50'
            }"
            ${currentPage === 1 ? 'disabled' : 'data-page="' + (currentPage - 1) + '"'}
            ${currentPage === 1 ? '' : 'class="page-btn"'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </button>
          
          ${pageNumbers.map((page, index) => {
            if (page === '...') {
              return `<span key="ellipsis-${index}" class="mx-1 text-gray-500">...</span>`;
            } else {
              return `
                <button
                  class="page-btn w-9 h-9 flex items-center justify-center rounded-full ${
                    currentPage === page
                      ? 'bg-blue-500 text-white'
                      : 'border border-gray-300 hover:border-blue-500 hover:text-blue-500'
                  }"
                  data-page="${page}"
                >
                  ${page}
                </button>
              `;
            }
          }).join('')}
          
          <button 
            class="w-9 h-9 flex items-center justify-center rounded-full border ${
              currentPage === totalPages 
                ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                : 'border-blue-500 text-blue-500 hover:bg-blue-50'
            }"
            ${currentPage === totalPages ? 'disabled' : 'data-page="' + (currentPage + 1) + '"'}
            ${currentPage === totalPages ? '' : 'class="page-btn"'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    `;
  };

  // Add changePage function to handle pagination
  const changePage = (page) => {
    // Set loading state and update current page
    setLoading(true);
    setCurrentPage(page);
    
    if (allProperties[selectedCounty]?.[selectedStatus]) {
      // Calculate the slice of properties to display
      const startIndex = (page - 1) * propertiesPerPage;
      const endIndex = startIndex + propertiesPerPage;
      const paginatedProperties = allProperties[selectedCounty][selectedStatus].slice(startIndex, endIndex);
      
      // Update displayed properties
      setPropertiesByCounty(prev => ({
        ...prev,
        [selectedCounty]: {
          ...prev[selectedCounty],
          [selectedStatus]: paginatedProperties
        }
      }));
      
      setLoading(false);
      
      // Update the DOM to reflect these changes
      updateCountyDetailsInDom();
    } else {
      setLoading(false);
    }
  };

  // Adjust map rendering and composition with mobile support
  return (
    <div className="flex flex-col w-full">
      {/* Mobile/Desktop View Toggle */}
      <div className="md:hidden mb-4 px-4">
        <MobileCountySelector onCountySelected={handleCountyClick} />
      </div>
      
      {/* Map Section - Only visible on larger screens with increased height */}
      <div className={`map-container relative hidden md:block ${mapLoaded ? 'opacity-100' : 'opacity-0'}`}
           style={{ height: '500px', transition: 'opacity 1s ease-in-out' }}>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 4000,
            center: [-77.85, 40.55]
          }}
          style={{
            width: '100%',
            height: '100%'
          }}
        >
          <ZoomableGroup 
            center={[0, 0]}
            zoom={1.0}
            translateExtent={[
              [-200, -200],
              [1000, 800]
            ]}
            // Disable zoom on scroll
            onWheelCapture={e => e.preventDefault()}
            onWheel={e => e.preventDefault()}
          >
            {geoData && (
              <Geographies geography={geoData}>
                {({ geographies }) =>
                  geographies.map(geo => {
                    const countyFips = geo.properties.COUNTY;
                    const fullFips = `42${countyFips}`;
                    const countyStyle = COUNTY_STYLES[fullFips];
                    const fillColor = countyStyle ? countyStyle.color : DEFAULT_FILL;
                    const hoverColor = countyStyle ? countyStyle.hoverColor : '#CBD5E1';
                    const centroid = geoCentroid(geo);
                    const countyName = countyStyle ? countyStyle.name : (geo.properties.NAME || 'County');
    
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={fillColor}
                        stroke={STATE_STROKE}
                        strokeWidth={0.5}
                        style={{
                          default: { outline: 'none' },
                          hover: { fill: hoverColor, outline: 'none', cursor: 'pointer' },
                          pressed: { outline: 'none' }
                        }}
                        onMouseEnter={(e) => {
                          setTooltipContent(countyName);
                        }}
                        onMouseMove={(e) => {
                          setTooltipPosition({ x: e.clientX, y: e.clientY });
                        }}
                        onMouseLeave={() => {
                          setTooltipContent(null);
                        }}
                        onClick={() => {
                          if (countyStyle) {
                            handleCountyClick(fullFips);
                          }
                        }}
                      >
                        {countyStyle && (
                          <text
                            textAnchor="middle"
                            x={centroid[0]}
                            y={centroid[1]}
                            fill="#000"
                            fontSize={10}
                            fontWeight="bold"
                            style={{
                              pointerEvents: 'none',
                              textShadow: '0px 0px 2px #fff'
                            }}
                          >
                            {countyStyle.name}
                          </text>
                        )}
                      </Geography>
                    );
                  })
                }
              </Geographies>
            )}
          </ZoomableGroup>
        </ComposableMap>
        
        {tooltipContent && (
          <div 
            className="tooltip" 
            style={{
              position: 'absolute',
              top: tooltipPosition.y,
              left: tooltipPosition.x,
              backgroundColor: 'rgba(30, 41, 59, 0.85)',
              color: '#fff',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '0.875rem',
              pointerEvents: 'none',
              transform: 'translate(10px, 10px)',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            {tooltipContent}
          </div>
        )}
      </div>
      
      {/* County Details Section with improved transitions */} 
      {selectedCounty && (
        <div id="map-county-details-section" 
            className={`county-details-section bg-white border-t border-gray-200 mt-4 overflow-visible transition-all duration-300 ${isTransitioning ? 'opacity-80' : 'opacity-100'}`}
            style={{ minHeight: loading ? '400px' : 'auto' }}>
            {loading ? (
              <div className="p-6 animate-fade-in property-loading-container">
                <PropertyLoadingSkeleton />
              </div>
            ) : (
              renderCountyDetails()
            )}
        </div>
      )}
    </div>
  );
};

export default InteractiveRealEstateMap;
