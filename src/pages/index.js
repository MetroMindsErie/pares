"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import SearchBar from '../components/SearchBar';
import SearchResults from '../components/SearchResults';
import { Hero } from '../components/Hero';
import { Contact } from '../components/Contact';
import Reels from '../components/Reels';
import Blog from '../components/Blog';
import Stablecoin from '../components/Stablecoin';
import { useAuth } from '../context/auth-context';
import Layout from '../components/Layout';
import { handleProfileNavigation } from '../utils/profileUtils';

const HomePage = ({ featuredListings = [], heroContent }) => {
  const router = useRouter();
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const { user, isAuthenticated } = useAuth();

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

  const handleEmailClick = async (e) => {
    e.preventDefault();
    
    if (user) {
      await handleProfileNavigation(user, router);
    } else {
      // If no user is logged in, redirect to login
      router.push('/login');
    }
  };

  return (
      <main className="pt-16"> {/* Main page content */}
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
          {isAuthenticated ? (
            <>
              {isSearching && typeof SearchResults === 'function' && searchResults.length > 0 && (
                <SearchResults listings={searchResults} />
              )}
              <Blog />
              <Stablecoin />
              <Reels />
              <div className="mt-16 bg-gray-100 rounded-xl p-8 border border-black">
                <Contact />
              </div>
            </>
          ) : (
            <div className="text-center text-gray-700">
              Enjoy our free guest tier. To log in or sign up, use options in the navbar.
            </div>
          )}
          <Hero content={heroContent} />
          <div className="some-container">
            <a href="#" onClick={handleEmailClick} className="email-link">
              {user?.email || 'Sign in'}
            </a>
          </div>
        </div>
      </main>
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

export default HomePage;
