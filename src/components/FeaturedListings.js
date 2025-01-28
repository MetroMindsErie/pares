import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import TrestleClient from 'trestle_client/lib/TrestleClient';
import Logger from 'trestle_client/lib/Logger';
import Link from 'next/link';

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

const FeaturedListings = ({ featuredListings }) => {
  const [listings, setListings] = useState([]);
  const [nextLink, setNextLink] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
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
    };

    fetchData();
  }, [featuredListings]);

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
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <section id="listings" className="p-4 bg-white rounded-lg shadow-md md:p-10">
        <h2 className="text-2xl font-bold text-center mb-6 md:text-3xl md:mb-8">Featured Listings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {listings.length > 0 ? (
            listings.map((listing) => (
              <Link key={listing.ListingKey} href={`/property/${listing.ListingKey}`} passHref>
                <div className="border rounded-lg overflow-hidden shadow-md cursor-pointer hover:shadow-lg transition-shadow">
                  <img
                    src={listing.media}
                    alt={listing.UnparsedAddress || 'Property Image'}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="text-lg font-bold">{listing.UnparsedAddress || 'No address'}</h3>
                    <p className="text-gray-600">
                      {listing.BedroomsTotal} Beds | {listing.BathroomsTotalInteger} Baths
                    </p>
                    <p className="text-sm text-gray-500">
                      {listing.StandardStatus ? `${listing.StandardStatus.toLocaleString()}` : 'Price not available'}
                    </p>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <p>No properties available.</p>
          )}
        </div>

        {/* Load More Button */}
        {nextLink && (
          <div className="mt-6 text-center">
            <button onClick={handleLoadMore} className="bg-blue-500 text-white py-2 px-4 rounded">
              Load More
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

FeaturedListings.propTypes = {
  featuredListings: PropTypes.array,
};

export default FeaturedListings;
