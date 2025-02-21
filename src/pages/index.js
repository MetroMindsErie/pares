"use client";
import { useState } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import SearchBar from '../components/Search';
import FeaturedListings from '../components/FeaturedListings';
import About from '../components/About';
import Contact from '../components/Contact';
import Footer from '../components/Footer';
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
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Render the updated SearchBar */}
          <SearchBar onSearchResults={handleSearchResults} />
          {/* Render FeaturedListings after the search bar */}
          <FeaturedListings 
            listings={isSearching ? searchResults : featuredListings} 
            title={isSearching ? "Search Results" : "Featured Listings"}
          />
        </div>
        {/* Render Hero below the featured properties */}
        <Hero content={heroContent} />
        <About />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}

// Assume getStaticProps calls your contentful service methods
export async function getStaticProps() {
  try {
    // Define heroContent and featuredListings (e.g., using your services)
    const heroContent = null; // temporary default value or fetched content
    const featuredListings = []; // temporary default value or fetched content

    return {
      props: {
        heroContent: heroContent || null,
        featuredListings: featuredListings || []
      },
      revalidate: 60
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
