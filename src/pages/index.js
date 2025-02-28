"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import SearchBar from '../components/SearchBar';
import SearchResults from '../components/SearchResults';
import { FeaturedListings } from '../components/FeaturedListings';
import { Hero } from '../components/Hero';
import { Contact } from '../components/Contact';
import { Footer } from '../components/Footer';

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

    if (router?.query && Object.keys(router.query).length) {
      router.replace('/', undefined, { shallow: true }).catch(() => { });
    }
  }, [router]);

  const handleSearchResults = (results) => {
    if (Array.isArray(results)) {
      setSearchResults(results);
      setIsSearching(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-black">
      <Navbar />
      <main className="flex-grow pt-16"> {/* Add top padding here */}
        <div className="relative bg-gray-100 pb-16 border-b border-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-black mb-4">
                Find Your Dream Home
              </h1>
              <p className="text-lg text-gray-600">
                Discover properties in your favorite locations
              </p>
            </div>
            <SearchBar onSearchResults={handleSearchResults} />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {isSearching ? (
            typeof SearchResults === 'function' ? (
              <SearchResults listings={searchResults} />
            ) : (
              <div>Error: SearchResults is not a component</div>
            )
          ) : (
           null
          )}

          <div className="mt-16 bg-gray-100 rounded-xl p-8 border border-black">
            <Contact />
          </div>
        </div>

        <Hero content={heroContent} />
      </main>
      <Footer />
    </div>
  );
}

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
