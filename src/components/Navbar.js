import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, Home, Building, Search, User, HeartIcon } from 'lucide-react';
import { useAuth } from '../context/auth-context';

const Navbar = ({ isAuthenticated, user, onLogout, onLogin, onRegister }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Update renderUserActions
  const renderUserActions = () => (
    <div className="hidden md:flex items-center space-x-4">
      {isAuthenticated ? (
        <>
          <Link href="/profile" className="px-4 py-2 text-gray-600 hover:text-blue-600">
            <User className="h-4 w-4 mr-2" />
            {user?.email}
          </Link>
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Logout
          </button>
        </>
      ) : (
        <>
          <button
            onClick={onLogin}
            className="px-4 py-2 text-blue-600 hover:text-blue-800"
          >
            Log In
          </button>
          <button
            onClick={onRegister}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Sign Up
          </button>
        </>
      )}
    </div>
  );

  // Update renderMobileUserActions
  const renderMobileUserActions = () => (
    <div className="pt-4 border-t border-gray-200">
      {isAuthenticated ? (
        <>
          <Link href="/profile" className="block w-full px-3 py-2 text-center text-gray-600">
            {user?.email}
          </Link>
          <button
            onClick={onLogout}
            className="block w-full mt-2 px-3 py-2 text-center bg-blue-600 text-white rounded"
          >
            Logout
          </button>
        </>
      ) : (
        <>
          <button
            onClick={onLogin}
            className="block w-full px-3 py-2 text-center text-blue-600"
          >
            Log In
          </button>
          <button
            onClick={onRegister}
            className="block w-full mt-2 px-3 py-2 text-center bg-blue-600 text-white rounded"
          >
            Sign Up
          </button>
        </>
      )}
    </div>
  );

  // Update the return statement to use the new components
  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${
      scrolled ? 'bg-white shadow-md py-2' : 'bg-transparent py-4'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
                <div className="flex items-center">
                <Link href="/" className="flex items-center">
                  <img src="/pares5.jpeg" alt="PaRes Logo" className="h-8 w-8 rounded-full" /> {/* Add logo image */}
                  <span className="ml-2 text-xl font-bold text-blue-600">PARES</span>
                </Link>
                </div>

                {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-gray-600 hover:text-blue-600 flex items-center">
              <Home className="h-4 w-4 mr-1" />
              <span>Home</span>
            </Link>
            <Link href="/" className="text-gray-600 hover:text-blue-600 flex items-center">
              <Building className="h-4 w-4 mr-1" />
              <span>Properties</span>
            </Link>
            <Link href="/" className="text-gray-600 hover:text-blue-600 flex items-center">
              <Search className="h-4 w-4 mr-1" />
              <span>Search</span>
            </Link>
            <Link href="/" className="text-gray-600 hover:text-blue-600 flex items-center">
              <HeartIcon className="h-4 w-4 mr-1" />
              <span>Favorites</span>
            </Link>
          </div>

          {renderUserActions()}

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600 hover:text-blue-600 focus:outline-none"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden bg-white shadow-lg rounded-b-lg mt-2">
          <div className="px-2 pt-2 pb-4 space-y-1">
            <Link href="/" className="block px-3 py-2 rounded text-gray-600 hover:bg-blue-50 hover:text-blue-600">
              <div className="flex items-center">
                <Home className="h-5 w-5 mr-2" />
                <span>Home</span>
              </div>
            </Link>
            <Link href="/properties" className="block px-3 py-2 rounded text-gray-600 hover:bg-blue-50 hover:text-blue-600">
              <div className="flex items-center">
                <Building className="h-5 w-5 mr-2" />
                <span>Properties</span>
              </div>
            </Link>
            <Link href="/search" className="block px-3 py-2 rounded text-gray-600 hover:bg-blue-50 hover:text-blue-600">
              <div className="flex items-center">
                <Search className="h-5 w-5 mr-2" />
                <span>Search</span>
              </div>
            </Link>
            <Link href="/favorites" className="block px-3 py-2 rounded text-gray-600 hover:bg-blue-50 hover:text-blue-600">
              <div className="flex items-center">
                <HeartIcon className="h-5 w-5 mr-2" />
                <span>Favorites</span>
              </div>
            </Link>
            {renderMobileUserActions()}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;