import React, { useEffect, useState } from 'react';
import TrestleClient from 'trestle_client/lib/TrestleClient'; // Adjust the import according to your file structure
import Logger from 'trestle_client/lib/Logger';
import axios from 'axios';
import Parser from './Parser';
import path from 'path';

const FeaturedListings = ({ featuredListings }) => {
  const [listingsWithMetadata, setListingsWithMetadata] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const tokenResponse = await axios.post('/api/token', {
        client_id: process.env.NEXT_PUBLIC_TRESTLE_CLIENT_ID,
        client_secret: process.env.NEXT_PUBLIC_TRESTLE_CLIENT_SECRET,
      });

      const token = tokenResponse.data.access_token;
      const client = new TrestleClient(
        { getToken: () => token },
        process.env.NEXT_PUBLIC_TRESTLE_BASE_URL,
        Logger.getLogger('TrestleClient', 'debug')
      );

      // File writer function to save images locally
      function fileWriter(headers, image) {
        const imagePath = path.join(__dirname, '..', '..', 'public', 'images', `${headers['Content-ID']}_${headers['Object-ID']}.jpg`);

        // Ensure the directory exists
        if (!fs.existsSync(path.dirname(imagePath))) {
          fs.mkdirSync(path.dirname(imagePath), { recursive: true });
        }

        // Write the image to the file system
        const f = fs.createWriteStream(imagePath);
        f.write(image);
        f.close();
      }
      // TODO: use trestle_media.js API to fetch images
      async function FetchImages(key, accessToken) {
        const res = await fetch(`https://api-trestle.corelogic.com/trestle/odata/Property('${key}')/Media/All`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        const contentType = res.headers.get('content-type');
        const boundary = contentType.split(';')[1].split('=')[1];
        const buffer = await res.arrayBuffer();

        const parser = new Parser(fileWriter);
        parser.parse(boundary, buffer);
      }

      try {
        // Fetch property data
        const propertyData = await client.getProperty(
          ['ListingKey', 'BathroomsTotalInteger', 'StandardStatus', 'UnparsedAddress', 'ListAgentFirstName', 'BedroomsTotal', 'PropertyType', 'SquareFeet', 'Media'],
          ['Rooms', 'UnitTypes', 'Media']
        );

        const getMediaUrls = async (listingKey, accessToken) => {
          try {
            const response = await fetch(`https://api-trestle.corelogic.com/trestle/odata/Media?$filter=ResourceRecordKey eq '${listingKey}'&$orderby=Order`, {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            const data = await response.json();
            return data.value.map(media => media.MediaURL);
          } catch (error) {
            Logger.log(`Error fetching media URLs: ${error.message}`);
            throw error;
          }
        }

        // Fetch media for each property and save images
        const mediaData = await Promise.all(
          propertyData.map(async (property) => {
            // Fetch images using the property ListingKey and access token
            await FetchImages(property.ListingKey, token);

            // Get media URLs
            const mediaUrls = await getMediaUrls(property.ListingKey, token);

            // Return property data along with the first media URL
            return {
              ListingKey: property.ListingKey,
              address: property.UnparsedAddress,
              bedrooms: property.BedroomsTotal,
              bathrooms: property.BathroomsTotalInteger,
              price: property.StandardStatus, // You may need to adjust this based on actual price field
              media: mediaUrls[0] || '/fallback-property-image.jpg' // Use the first media URL or a fallback image
            };
          })
        );

        // Update the state with the fetched media data
        setListingsWithMetadata(mediaData);
      } catch (error) {
        console.error('Error fetching property data or media:', error);
      }
    };

    fetchData();
  }, [featuredListings]);

  if (!listingsWithMetadata || listingsWithMetadata.length === 0) return null;

  return (
    <section id="listings" className="p-10 bg-gray-100">
      <h2 className="text-3xl font-bold text-center mb-8">Featured Listings</h2>
      <div className="flex overflow-x-auto space-x-6 pb-4">
        {listingsWithMetadata.map((listing, index) => (
          <div key={index} className="flex-none w-60 border rounded-lg overflow-hidden shadow-md">
            <img
              src={listing.media} // Ensure this points to your saved image URL
              alt={listing.address || 'Property Image'}
              className="w-full h-48 object-cover"
            />
            <div className="p-4">
              <h3 className="text-xl font-bold">{listing.address || 'No address'}</h3>
              <p className="text-gray-600">
                {listing.bedrooms} Beds | {listing.bathrooms} Baths
              </p>
              <p className="text-sm text-gray-500">
                {listing.price ? `${listing.price.toLocaleString()}` : 'Price not available'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FeaturedListings;
