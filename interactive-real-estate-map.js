import { useState, useEffect } from 'react';
import { geoCentroid } from 'd3-geo';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from 'react-simple-maps';
import { useRouter } from 'next/router';
import { getPropertiesByFilter, getNextProperties } from './src/services/trestleServices';
import HeatMapGraph from './src/components/HeatMapGraph';

const PENNSYLVANIA_CENTER = [-77.5, 40.8];

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

const InteractiveRealEstateMap = () => {
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

  // Fetch properties when a county is selected.
  useEffect(() => {
    const fetchProperties = async () => {
      if (selectedCounty && !propertiesByCounty[selectedCounty]) {
        setLoading(true);
        setError(null);
        try {
          const countyName = COUNTY_STYLES[selectedCounty].name;

          const [activeProperties, closedProperties] = await Promise.all([
            getPropertiesByFilter(
              `$filter=CountyOrParish eq '${countyName}' and StandardStatus eq 'Active' and PropertyType eq 'Residential'`
            ),
            getPropertiesByFilter(
              `$filter=CountyOrParish eq '${countyName}' and StandardStatus eq 'Closed' and PropertyType eq 'Residential'`
            )
          ]);

          setPropertiesByCounty(prev => ({
            ...prev,
            [selectedCounty]: { 
              active: activeProperties.properties, 
              closed: closedProperties.properties 
            }
          }));
          setNextLink(activeProperties.nextLink);
        } catch (err) {
          setError('Failed to load properties');
          console.error(err);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchProperties();
  }, [selectedCounty]);

  const loadMoreProperties = async () => {
    if (nextLink) {
      setLoading(true);
      setError(null);
      try {
        const { properties, nextLink: newNextLink } = await getNextProperties(nextLink);

        setPropertiesByCounty(prev => ({
          ...prev,
          [selectedCounty]: {
            ...prev[selectedCounty],
            active: [...prev[selectedCounty].active, ...properties]
          }
        }));
        setNextLink(newNextLink);
      } catch (err) {
        setError('Failed to load more properties');
        console.error(err);
      } finally {
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
  }, []);

  const handleCountyClick = (countyFips) => {
    setSelectedCounty(countyFips);
  };

  const handlePropertyClick = (propertyId) => {
    router.push(`/property/${propertyId}`);
  };

  // Helper function to compute aggregated MLS data for the heat map graph.
  // We assume each property has a "Neighborhood" and "ListPrice" field.
  const computeMLSHeatMapData = (properties) => {
    const groups = {};
    properties.forEach(property => {
      const neighborhood = property.Neighborhood || 'Unknown';
      if (!groups[neighborhood]) {
        groups[neighborhood] = { count: 0, totalPrice: 0 };
      }
      groups[neighborhood].count += 1;
      groups[neighborhood].totalPrice += property.ListPrice || 0;
    });
    const neighborhoods = Object.keys(groups);
    const data = neighborhoods.map(nb => {
      const group = groups[nb];
      const avgPrice = group.count ? Math.round(group.totalPrice / group.count) : 0;
      return [group.count, avgPrice];
    });
    const metrics = ['Listing Count', 'Avg Price'];
    return { neighborhoods, metrics, data };
  };

  // Existing static neighborhood heat map
  const renderHeatMap = (neighborhoods) => {
    if (!neighborhoods) return null;
    
    return (
      <div className="neighborhood-heat-map mt-4">
        <h3 className="text-lg font-semibold mb-2">Neighborhood Heat Map</h3>
        <div className="flex flex-wrap gap-2">
          {neighborhoods.map((neighborhood, index) => {
            const intensity = Math.floor(neighborhood.heatIndex * 255);
            const backgroundColor = `rgb(${255 - intensity}, ${intensity}, 0)`;
            
            return (
              <div 
                key={index}
                className="p-2 rounded shadow"
                style={{ 
                  backgroundColor,
                  width: '48%',
                  marginBottom: '8px'
                }}
              >
                <div className="text-sm font-medium">{neighborhood.name}</div>
                <div className="text-xs">Demand Index: {(neighborhood.heatIndex * 10).toFixed(1)}/10</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderCountyDetails = () => {
    if (!selectedCounty) return (
      <div className="p-4 text-center">
        <h2 className="text-xl font-semibold">County Details</h2>
        <p className="text-gray-500 mt-2">Select a county on the map to view details</p>
      </div>
    );
  
    const county = COUNTY_STYLES[selectedCounty];
    const properties = propertiesByCounty[selectedCounty]?.[selectedStatus] || [];
  
    // Compute real MLS heat map data based on active listings.
    const mlsHeatMapData =
      propertiesByCounty[selectedCounty]?.active &&
      propertiesByCounty[selectedCounty].active.length > 0
        ? computeMLSHeatMapData(propertiesByCounty[selectedCounty].active)
        : null;
  
    return (
      <div className="p-4">
        <h2 className="text-2xl font-semibold mb-4">{county.name} County Details</h2>
        <p className="text-gray-700 mb-4">{county.details.description}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-lg font-semibold mb-2">Population</h3>
            <p className="text-2xl">{county.details.population.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-lg font-semibold mb-2">Median Home Price</h3>
            <p className="text-2xl">{county.details.medianHomePrice}</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-lg font-semibold mb-2">Average Income per Household</h3>
            <p className="text-2xl">{county.details.averageIncomePerHousehold}</p>
          </div>
        </div>
  
        {/* {renderHeatMap(county.details.neighborhoods)} */}
        
        {/* New MLS Data Heat Map Graph based on real MLS data */}
        {/* {mlsHeatMapData ? (
          console.log(mlsHeatMapData),
          <div className="mls-heatmap mt-6">
            <h3 className="text-lg font-semibold mb-2">MLS Data Heat Map</h3>
            <HeatMapGraph
              neighborhoods={mlsHeatMapData.neighborhoods}
              metrics={mlsHeatMapData.metrics}
              data={mlsHeatMapData.data}
            />
          </div>
        ) : (
          <p className="mt-6 text-gray-500">No MLS data available for heat map.</p>
        )} */}
  
        <div className="mt-6">
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setSelectedStatus('active')}
              className={`px-4 py-2 rounded ${selectedStatus === 'active' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              Active Listings
            </button>
            <button
              onClick={() => setSelectedStatus('closed')}
              className={`px-4 py-2 rounded ${selectedStatus === 'closed' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              Closed Listings
            </button>
          </div>
          {loading && <p>Loading properties...</p>}
          {error && <p className="text-red-500">{error}</p>}
  
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {properties.map(property => (
              <div 
                key={property.ListingKey} 
                className="bg-white rounded-lg shadow p-4 cursor-pointer"
                onClick={() => handlePropertyClick(property.ListingKey)}
              >
                <img
                  src={property.media}
                  alt={property.UnparsedAddress}
                  className="w-full h-48 object-cover rounded mb-2"
                />
                <h3 className="font-semibold text-lg">
                  ${property.ListPrice?.toLocaleString()}
                </h3>
                <p className="text-sm text-gray-600">{property.UnparsedAddress}</p>
                <div className="mt-2 text-sm">
                  <p>Beds: {property.BedroomsTotal || 'N/A'}</p>
                  <p>Baths: {property.BathroomsTotalInteger || 'N/A'}</p>
                  <p>Sq Ft: {property.LivingArea?.toLocaleString() || 'N/A'}</p>
                </div>
              </div>
            ))}
          </div>
  
          {nextLink && (
            <button
              onClick={loadMoreProperties}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
            >
              Load More Properties
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="pa-real-estate-dashboard flex flex-col w-full max-w-4xl mx-auto border border-gray-200 rounded-lg overflow-hidden">
      {/* Map Section */}
      <div className="map-section border-b border-gray-200 p-4 bg-gray-50" style={{ position: 'relative' }}>
        <h2 className="text-xl font-semibold mb-2">Pennsylvania Counties Map</h2>
        <div className="map-container" style={{ height: '400px' }}>
          <ComposableMap
            projection="geoAlbersUsa"
            projectionConfig={{
              scale: 8000,
              // Remove or set rotation to zero to keep the map horizontal
              rotate: [10,20, 30]
            }}
            style={{
              width: '100%',
              height: '100%'
            }}
          >
            <ZoomableGroup center={PENNSYLVANIA_CENTER} zoom={1.4}>
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
        </div>
        <div className="map-legend mt-3 flex gap-6 justify-center text-sm">
          {Object.values(COUNTY_STYLES).map(({ name, color }) => (
            <div key={name} className="flex items-center gap-2">
              <div className="w-4 h-4" style={{ backgroundColor: color }} />
              <span>{name}</span>
            </div>
          ))}
        </div>
        {tooltipContent && (
          <div 
            className="tooltip" 
            style={{
              position: 'absolute',
              top: tooltipPosition.y + 10,
              left: tooltipPosition.x + 10,
              backgroundColor: 'rgba(0,0,0,0.75)',
              color: '#fff',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '0.8rem',
              pointerEvents: 'none'
            }}
          >
            {tooltipContent}
          </div>
        )}
      </div>
      
      {/* County Details Section */}
      <div className="county-details-section bg-white">
        {renderCountyDetails()}
      </div>
    </div>
  );
};

export default InteractiveRealEstateMap;
