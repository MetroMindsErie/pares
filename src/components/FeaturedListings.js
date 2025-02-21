import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import TrestleClient from 'trestle_client/lib/TrestleClient';
import Logger from 'trestle_client/lib/Logger';
import Link from 'next/link';
import Image from 'next/image';

export const fetchToken = async () => {
  const response = await axios.post('/api/token', {
    client_id: process.env.NEXT_PUBLIC_TRESTLE_CLIENT_ID,
    client_secret: process.env.NEXT_PUBLIC_TRESTLE_CLIENT_SECRET,
  });
  return response.data.access_token;
};

const fetchPropertyData = async (
  client,
  fields = ['ListingKey', 'BathroomsTotalInteger', 'StandardStatus', 'UnparsedAddress', 'ListAgentFirstName', 'BedroomsTotal', 'PropertyType', 'Media'],
  expand = [],
  nextLink = ''
) => {
  try {
    // Make the request with or without the nextLink
    const response = nextLink
      ? await client.makeRequest(nextLink)
      : await client.getProperty(fields, expand);

    console.log('API Response:', response);  // Log the full API response

    // Handle both response structures
    const properties = nextLink
      ? response.value || [] // For paginated requests
      : response.unfilteredData?.value || []; // For initial requests

    const newNextLink = nextLink
      ? response['@odata.nextLink'] || null // For paginated requests
      : response.unfilteredData?.['@odata.nextLink'] || null; // For initial requests

    console.log('Fetched properties:', properties);
    console.log('Next link:', newNextLink); // Debugging nextLink

    return { properties, newNextLink };
  } catch (error) {
    console.error('Error fetching property data:', error.message);
    return { properties: [], newNextLink: null };
  }
};

const fetchMediaUrls = async (listingKey, token) => {
  const response = await axios.get(`https://api-trestle.corelogic.com/trestle/odata/Media?$filter=ResourceRecordKey eq '${listingKey}'&$orderby=Order`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.value.map((media) => media.MediaURL);
};

const FeaturedListings = ({ title, featuredListings, searchResults }) => {
  const [listings, setListings] = useState([]);
  const [nextLink, setNextLink] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!searchResults) {
        try {
          const token = await fetchToken();
          const client = new TrestleClient(
            { getToken: () => token },
            process.env.NEXT_PUBLIC_TRESTLE_BASE_URL,
            Logger.getLogger('TrestleClient', 'debug')
          );

          // Fetch properties, check if nextLink exists
          const { properties, newNextLink } = await fetchPropertyData(client);

          console.log('Fetched properties:', properties);  // Log the properties fetched

          // Fetch media URLs for all properties
          const listingsWithMedia = await Promise.all(
            properties?.map(async (property) => {
              const mediaUrls = await fetchMediaUrls(property.ListingKey, token);
              return {
                ...property,
                media: mediaUrls[0] || '/fallback-property-image.jpg',
              };
            }) || [] // Return an empty array if 'properties' is undefined
          );

          console.log('Listings with media:', listingsWithMedia); // Log the listings with media

          // Set listings and nextLink for pagination
          setListings(listingsWithMedia);
          setNextLink(newNextLink);  // Store nextLink for pagination
        } catch (error) {
          console.error('Error fetching data:', error);
        }
      }
    };

    fetchData();
  }, [featuredListings, searchResults]);

  useEffect(() => {
    const fetchMediaForSearchResults = async () => {
      if (searchResults) {
        const token = await fetchToken();
        const listingsWithMedia = await Promise.all(
          searchResults.map(async (property) => {
            const mediaUrls = await fetchMediaUrls(property.ListingKey, token);
            return {
              ...property,
              media: mediaUrls[0] || '/fallback-property-image.jpg',
            };
          })
        );
        setListings(listingsWithMedia);
      }
    };

    fetchMediaForSearchResults();
  }, [searchResults]);

  const handleLoadMore = async () => {
    if (!nextLink) {
      console.log("No nextLink available");
      return;
    }

    try {
      const token = await fetchToken();
      const client = new TrestleClient(
        { getToken: () => token },
        process.env.NEXT_PUBLIC_TRESTLE_BASE_URL,
        Logger.getLogger('TrestleClient', 'debug')
      );

      // Fetch the next batch of properties using the stored nextLink
      const { properties, newNextLink } = await fetchPropertyData(client, [], [], nextLink);

      if (properties.length === 0) {
        console.log("No new properties to load");
        return;
      }

      // Check for existing ListingKeys to prevent duplication
      const existingListingKeys = new Set(listings.map((listing) => listing.ListingKey));

      // Filter out already fetched properties
      const newProperties = properties.filter((property) => !existingListingKeys.has(property.ListingKey));

      if (newProperties.length === 0) {
        console.log("No new properties to load");
        return;
      }

      // Fetch media URLs for the new properties
      const listingsWithMedia = await Promise.all(
        newProperties.map(async (property) => {
          const mediaUrls = await fetchMediaUrls(property.ListingKey, token);
          return {
            ...property,
            media: mediaUrls[0] || '/fallback-property-image.jpg',
          };
        })
      );

      console.log("Fetched properties with media:", listingsWithMedia); // Log to check data

      // Append new listings to the existing ones
      setListings((prevListings) => {
        console.log("Previous listings before update:", prevListings); // Log the previous state
        const updatedListings = [...prevListings, ...listingsWithMedia]; // Append new listings
        console.log("Updated listings after append:", updatedListings); // Log the updated state
        return updatedListings; // Return the updated listings
      });

      // Update the nextLink for further pagination
      setNextLink(newNextLink);

    } catch (error) {
      console.error('Error loading more properties:', error);
    }
  };

  return (
    <section className="mb-16">
      <h2 className="text-3xl font-bold text-gray-900 mb-8">{title}</h2>
      {/* Aesthetic border & horizontal scroll container */}
      <div className="flex space-x-4 overflow-x-auto border border-gray-300 rounded-lg p-4">
        {listings.slice(0, 10).map((listing) => (  // changed from slice(0, 6) to slice(0, 10)
          <Link 
            key={listing.ListingKey} 
            href={`/property/${listing.ListingKey}`}
            className="min-w-[280px] flex-shrink-0 group block rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300"
          >
            <div className="relative h-60 bg-gray-100">
              <Image
                src={listing.media || '/fallback-property.jpg'}
                alt={listing.UnparsedAddress}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
              {listing.StandardStatus === 'Closed' && (
                <div className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Sold
                </div>
              )}
            </div>
            
            <div className="p-4 bg-white">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {listing.UnparsedAddress}
              </h3>
              <p className="text-gray-500 text-sm mt-1">
                {listing.BedroomsTotal} beds · {listing.BathroomsTotalInteger} baths
              </p>
              <p className="text-xl font-bold text-gray-900 mt-2">
                {listing.ListPrice ? `$${listing.ListPrice.toLocaleString()}` : 'Price not available'}
              </p>
              <div className="mt-2 flex items-center text-sm text-gray-500">
                <span className="truncate">{listing.PropertyType}</span>
                {listing.LivingAreaSqFt && (
                  <span className="ml-2">
                    · {listing.LivingAreaSqFt.toLocaleString()} sqft
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
      
      {listings?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No properties found</p>
        </div>
      )}
    </section>
  );
}
  FeaturedListings.propTypes = {
    listings: PropTypes.array,
    title: PropTypes.string.isRequired,
  };
  
  export default FeaturedListings;
