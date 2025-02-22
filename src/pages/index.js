"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Navbar } from '../components/Navbar';
import { SearchBar } from '../components/Search';
import { FeaturedListings } from '../components/FeaturedListings';
import { SearchResults } from '../components/SearchResults';
import { Hero } from '../components/Hero';
import { Contact } from '../components/Contact';
import { Footer } from '../components/Footer';
import 'leaflet/dist/leaflet.css';
import '../styles/globals.css';

export default function Home({ featuredListings = [], heroContent }) {
  const router = useRouter();
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const storedResults = localStorage.getItem('searchResults');
    if (storedResults) {
      try {
        const parsedResults = JSON.parse(storedResults);
        setSearchResults(Array.isArray(parsedResults) ? parsedResults : []);
        setIsSearching(true);
      } catch (error) {
        console.error('Error parsing search results:', error);
        setSearchResults([]);
      }
    }
    
    // Safe router query cleanup
    if (router?.query && Object.keys(router.query).length) {
      router.replace('/', undefined, { shallow: true }).catch(() => {});
    }
  }, [router]);

  const handleSearchResults = (results) => {
    if (Array.isArray(results)) {
      setSearchResults(results);
      setIsSearching(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        {/* Hero Section */}
        <div className="relative bg-blue-50 pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Find Your Dream Home
              </h1>
              <p className="text-lg text-gray-600">
                Discover properties in your favorite locations
              </p>
            </div>
            <SearchBar onSearchResults={handleSearchResults} />
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {isSearching ? (
            <SearchResults listings={searchResults} />
          ) : (
            <FeaturedListings 
              listings={featuredListings} 
              title="Featured Homes" 
            />
          )}

          <div className="mt-16 bg-gray-50 rounded-xl p-8">
            <Contact />
          </div>
        </div>

        <Hero content={heroContent} />
      </main>
      <Footer />
    </div>
  );
}

// Keep getStaticProps the same

export async function getStaticProps() {
  try {
    const heroContent = null;
    const featuredListings = [];
    return {
      props: {
        heroContent: heroContent || null,
        featuredListings: featuredListings || []
      },
      revalidate: 60
    };
  } catch (error) {
    console.error('Error fetching content:', error);
    return { props: { heroContent: null, featuredListings: [] } };
  }
}
