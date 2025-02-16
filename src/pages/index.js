"use client";
import { useState } from 'react';
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import FeaturedListings from "../components/FeaturedListings";
import About from "../components/About";
import Contact from "../components/Contact";
import Footer from "../components/Footer";
import SearchBar from "../components/Search";
import client from "../../contentful";
import 'leaflet/dist/leaflet.css';
import '../styles/globals.css';

export default function Home({ featuredListings, heroContent }) {
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearchResults = (results) => {
    setSearchResults(results);
    setIsSearching(true);
  };

  return (
    <div>
      <header>
        <Navbar />
      </header>
      <main>
        <SearchBar onSearchResults={handleSearchResults} />
        
        {/* Conditionally render search results or featured listings */}
        {isSearching ? (
          <FeaturedListings 
            listings={searchResults} 
            title="Search Results"
          />
        ) : (
          <FeaturedListings 
            listings={featuredListings} 
            title="Featured Listings"
          />
        )}

        <Hero content={heroContent} />
        <About />
        <Contact />
      </main>
      <footer>
        <Footer />
      </footer>
    </div>
  );
}

export async function getStaticProps() {
  try {
    const [heroRes, listingsRes] = await Promise.all([
      client.getEntries({ content_type: 'agent' }),
      client.getEntries({ 
        content_type: 'propertyListing',
        limit: 12,
        order: '-fields.date'
      })
    ]);

    return {
      props: {
        heroContent: heroRes.items[0]?.fields || null,
        featuredListings: listingsRes.items.map(item => item.fields) || []
      },
      revalidate: 60, // Revalidate every 60 seconds
    };
  } catch (error) {
    console.error('Error fetching content:', error);
    return {
      props: {
        heroContent: null,
        featuredListings: []
      }
    };
  }
}