import React, { useEffect, useState } from 'react';
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

const FeaturedListings = ({ listings, title }) => {
  return (
    <section className="py-12 px-4">
      <h2 className="text-3xl font-bold text-center mb-8">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {listings?.map((listing) => (
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
                  {listing.ListPrice ? `$${listing.ListPrice.toLocaleString()}` : 'Price not available'}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
      {listings?.length === 0 && (
        <p className="text-center text-gray-500 mt-8">No properties found</p>
      )}
    </section>
  );
};

const ListingCard = ({ listing }) => {
  const address = listing.UnparsedAddress || listing.address;
  const beds = listing.BedroomsTotal || listing.bedrooms;
  const baths = listing.BathroomsTotalInteger || listing.bathrooms;
  const price = listing.StandardStatus || listing.price;
  const media = listing.media || listing.image?.fields?.file?.url;

  return (
    <Link href={`/property/${listing.ListingKey || listing.id}`} passHref>
      <div className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow cursor-pointer">
        <img
          src={media || '/fallback-property-image.jpg'}
          alt={address}
          className="w-full h-48 object-cover"
          onError={(e) => {
            e.target.src = '/fallback-property-image.jpg';
          }}
        />
        <div className="p-4">
          <h3 className="text-lg font-bold">{address || 'No address available'}</h3>
          <p className="text-gray-600">
            {beds || 'N/A'} Beds | {baths || 'N/A'} Baths
          </p>
          <p className="text-sm text-gray-500">
            {price ? `$${price.toLocaleString()}` : 'Price not available'}
          </p>
        </div>
      </div>
    </Link>
  );
};

export default FeaturedListings;
