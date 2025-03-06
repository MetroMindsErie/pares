import { useState, useEffect } from 'react';
import { geoCentroid } from 'd3-geo';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from 'react-simple-maps';
import { useRouter } from 'next/router';
import { getPropertiesByFilter, getNextProperties } from '../services/trestleServices';

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

const InteractiveRealEstateMap = () => {
  const [selectedCounty, setSelectedCounty] = useState(null);
  const [propertiesByCounty, setPropertiesByCounty] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [nextLink, setNextLink] = useState(null);

  // Fetch properties when a county is selected.
  useEffect(() => {
    const fetchProperties = async () => {
      if (selectedCounty && !propertiesByCounty[selectedCounty]) {
        setLoading(true);
        setError(null);
        try {
          const countyName = COUNTY_STYLES[selectedCounty].name;
          console.log(`Fetching properties for ${countyName} county...`);

          // Use the correct filter syntax
          const activeFilter = `CountyOrParish eq '${countyName}' and StandardStatus eq 'Active' and PropertyType eq 'Residential'`;
          const closedFilter = `CountyOrParish eq '${countyName}' and StandardStatus eq 'Closed' and PropertyType eq 'Residential'`;

          const [activeProperties, closedProperties] = await Promise.all([
            getPropertiesByFilter(activeFilter),
            getPropertiesByFilter(closedFilter)
          ]);

          setPropertiesByCounty(prev => ({
            ...prev,
            [selectedCounty]: { 
              active: activeProperties.properties, 
              closed: closedProperties.properties 
            }
          }));
          setNextLink(activeProperties.nextLink);
          console.log(`Successfully fetched ${activeProperties.properties.length} active and ${closedProperties.properties.length} closed properties`);
        } catch (err) {
          console.error('Failed to load properties:', err);
          setError(`Failed to load properties: ${err.message}`);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchProperties();
  }, [selectedCounty]);

  return (
    <ComposableMap>
      <ZoomableGroup center={PENNSYLVANIA_CENTER} zoom={1}>
        <Geographies geography="/path/to/your/topojson">
          {({ geographies }) =>
            geographies.map(geo => {
              const centroid = geoCentroid(geo);
              const countyId = geo.id;
              const countyStyle = COUNTY_STYLES[countyId] || {};
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onClick={() => setSelectedCounty(countyId)}
                  style={{
                    default: { fill: countyStyle.color || '#DDD' },
                    hover: { fill: countyStyle.hoverColor || '#AAA' },
                    pressed: { fill: countyStyle.hoverColor || '#AAA' }
                  }}
                />
              );
            })
          }
        </Geographies>
      </ZoomableGroup>
    </ComposableMap>
  );
};

export default InteractiveRealEstateMap;
