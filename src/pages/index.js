// /pages/index.js
"use client";
import { useState } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import FeaturedListings from '../components/FeaturedListings';
import About from '../components/About';
import Contact from '../components/Contact';
import Footer from '../components/Footer';
import SearchBar from '../components/Search';
import 'leaflet/dist/leaflet.css';
import '../styles/globals.css';
import '../styles/propertyTemplates.css'
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
        {isSearching ? (
          <FeaturedListings searchResults={searchResults} title="Search Results" />
        ) : (
          <FeaturedListings featuredListings={featuredListings} title="Featured Listings" />
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

// Assume getStaticProps calls your contentful service methods
export async function getStaticProps() {
  try {
    // For example, use a service file /services/contentfulService.js here
    const heroContent = await import('../services/contentfulService')
      .then((mod) => mod.getHeroContent());
    const featuredListings = await import('../services/contentfulService')
      .then((mod) => mod.getFeaturedListings());
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
