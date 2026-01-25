import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../context/auth-context';
import { clearCachedSearchResults } from '../lib/searchCache';
import PartnersTicker from './PartnersTicker';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isAuthenticated, logout, getUserRole, refreshUserData } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [isCryptoInvestor, setIsCryptoInvestor] = useState(false);
  const [browseDropdownOpen, setBrowseDropdownOpen] = useState(false);
  
  // Use refs to track if useEffects have already run to prevent loops
  const roleCheckedRef = useRef(false);
  const refreshedUserRef = useRef(false);

  // Set isClient to true when component mounts (client-side only)
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Force refresh user data only once when component mounts
  useEffect(() => {
    if (isClient && isAuthenticated && user?.id && !refreshedUserRef.current) {
      refreshedUserRef.current = true;
      
      refreshUserData(user.id).then(() => {
        const role = getUserRole();
        setIsCryptoInvestor(role === 'crypto_investor');
      });
    }
  }, [isClient, isAuthenticated, user?.id, refreshUserData, getUserRole]);
  
  // Check role - only run once
  useEffect(() => {
    if (isClient && !roleCheckedRef.current) {
      roleCheckedRef.current = true;
      
      if (isAuthenticated && user) {
        const role = getUserRole();
        setIsCryptoInvestor(role === 'crypto_investor');
      }
    }
  }, [isClient, isAuthenticated, user, getUserRole]);
  
  // Close mobile menu on route changes
  useEffect(() => {
    setIsOpen(false);
  }, [router.pathname]);
  
  const handleLogout = async () => {
    try {
      // Set the logout flag
      sessionStorage.setItem('isLoggingOut', 'true');
      
      // Clear any search cache immediately
      clearCachedSearchResults();
      
      // Clear other relevant caches
      for (const key in localStorage) {
        if (key.includes('pares_') || key.includes('supabase')) {
          localStorage.removeItem(key);
        }
      }
      
      // Set a timeout to prevent infinite loading state
      const timeoutId = setTimeout(() => {

        // Force full page reload and redirect to home
        window.location.href = '/';
      }, 3000);
      
      const result = await logout();
      
      // Clear the timeout if logout completes normally
      clearTimeout(timeoutId);
      
      sessionStorage.removeItem('isLoggingOut');
      
      // Check if there was an error during logout
      if (result && result.error) {
        console.error('Error during logout:', result.error);
      }
      
      // Always do a full page reload to clear any React state
      // and redirect to home page
      window.location.href = '/';
    } catch (err) {
      console.error('Unexpected error during logout:', err);
      // Clean up logout flag
      sessionStorage.removeItem('isLoggingOut');
      // Force full page reload even if there's an error
      window.location.href = '/';
    }
  };

  // Browse Properties menu items (filtered based on current route)
  const allBrowseMenuItems = [
    { label: 'Home Search', href: '/', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { label: 'AI Assisted Pricing', href: '/dashboard', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
    { label: 'Property Swiper', href: '/swipe', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01' }
  ];
  
  // Filter out current page from browse menu
  const browseMenuItems = allBrowseMenuItems.filter(item => item.href !== router.pathname);
  
  // Return early if not client-side yet to prevent hydration issues
  if (!isClient) {
    return (
      <React.Fragment>
        {/* keep the placeholder nav above the partners ticker by increasing z-index */}
        <nav
          className="backdrop-blur-md bg-white/20 border-b border-white/10 sticky top-0 h-16"
          style={{ zIndex: 80 }}
        />
        <PartnersTicker />
      </React.Fragment>
    );
  }
 
  const primaryLinks = [
    // { href: '/', label: 'Home' },
  ];
  
  // single shared style: thin blue border, transparent background — matches Pares logo border
  const borderedButtonClass = "inline-flex items-center h-10 leading-none px-4 py-2 border border-blue-200 text-sm font-medium rounded-md text-blue-600 bg-transparent hover:bg-white/5 transition-colors";

  const authedLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/saved-properties', label: 'Saved Properties' },
  ];
  
  return (
    <React.Fragment>
      {/* place navbar above ticker/hero overlays — inline zIndex ensures it's above partners-ticker (z-index:70) */}
      <nav
        className="backdrop-blur-md bg-white/20 dark:bg-gray-900/20 border-b border-white/10 sticky top-0"
        style={{ zIndex: 80 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Left side - Logo and navigation links */}
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                {/* add thin blue border and slight padding so logo remains visible on transparent navbar */}
                <Link
                  href="/"
                  className="font-serif text-2xl text-blue-700 hover:text-blue-900 transition duration-300 px-3 py-1 rounded-md border border-blue-200"
                >
                  Pares
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-8">
                {primaryLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    // Use identical button styling as the Login button for Home so size/height match
                    className={
                      link.href === '/'
                        ? borderedButtonClass
                        : `inline-flex items-center px-1 pt-1 border-b-2 ${
                            router.pathname === link.href
                              ? 'border-blue-500 text-gray-900'
                              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                          } text-sm font-medium`
                    }
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
            
            {/* Desktop auth links */}
            <div className="hidden sm:ml-6 sm:flex sm:items-center">
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  {/* Browse Properties Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setBrowseDropdownOpen(!browseDropdownOpen)}
                      className={borderedButtonClass}
                      onBlur={() => setTimeout(() => setBrowseDropdownOpen(false), 200)}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      Browse Properties
                      <svg className={`w-4 h-4 ml-1 transition-transform ${browseDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {browseDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                        <div className="py-1">
                          {browseMenuItems.map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                              onClick={() => setBrowseDropdownOpen(false)}
                            >
                              <svg className="w-5 h-5 mr-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                              </svg>
                              {item.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {authedLinks.map((link) => (
                    <Link key={link.href} href={link.href} className={borderedButtonClass}>
                      {link.label}
                    </Link>
                  ))}
                  <button onClick={handleLogout} className={borderedButtonClass}>
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="space-x-4">
                  <Link href="/login" className={borderedButtonClass}>
                    Log in
                  </Link>
                  <Link href="/register" className={borderedButtonClass}>
                    Sign up
                  </Link>
                </div>
              )}
            </div>
            
            {/* Mobile menu button */}
            <div className="-mr-2 flex items-center sm:hidden">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                aria-expanded="false"
              >
                <span className="sr-only">Open main menu</span>
                {!isOpen ? (
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                ) : (
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {/* Force dark palette on mobile and make text readable — no light/translucent backgrounds */}
        <div className={`${isOpen ? 'block' : 'hidden'} sm:hidden bg-gray-900 text-white`}>
          <div className="pt-2 pb-3 space-y-1">
            {primaryLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block w-full px-4 py-2 text-base font-medium rounded-md text-gray-100 hover:bg-gray-800 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="pt-4 pb-3">
            {isAuthenticated ? (
              <div className="space-y-1 px-2">
                {/* Mobile Browse Properties Section */}
                <div className="border-b border-gray-700 pb-2 mb-2">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Browse Properties
                  </div>
                  {browseMenuItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center px-4 py-2 text-base font-medium rounded-md text-gray-100 hover:bg-gray-800 transition-colors"
                    >
                      <svg className="w-5 h-5 mr-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                      </svg>
                      {item.label}
                    </Link>
                  ))}
                </div>

                {authedLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block w-full px-4 py-2 text-base font-medium rounded-md text-gray-100 hover:bg-gray-800 text-center transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}

                <button
                  onClick={handleLogout}
                  className="block w-full px-4 py-2 text-base font-medium rounded-md text-gray-100 hover:bg-gray-800 transition-colors"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="space-y-1 px-2">
                <Link href="/login" className="block w-full px-4 py-2 text-base font-medium rounded-md text-gray-100 hover:bg-gray-800 transition-colors">
                  Log in
                </Link>
                <Link href="/register" className="block w-full px-4 py-2 text-base font-medium rounded-md text-gray-100 hover:bg-gray-800 transition-colors">
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>
      {/* Always render partners ticker immediately below the navbar so it is present on every page */}
    </React.Fragment>
   );
 }