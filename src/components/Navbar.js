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
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  
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
  
  // Check wallet connection from localStorage - only run once
  useEffect(() => {
    if (isClient && !roleCheckedRef.current) {
      roleCheckedRef.current = true;
      
      if (isAuthenticated && user) {
        const role = getUserRole();
        setIsCryptoInvestor(role === 'crypto_investor');
      }
      
      // Check for saved wallet
      const savedAddress = localStorage.getItem('walletAddress');
      if (savedAddress) {
        setWalletAddress(savedAddress);
        setWalletConnected(true);
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
      
      // Clear wallet connection data
      setWalletConnected(false);
      setWalletAddress('');
      localStorage.removeItem('walletAddress');
      
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

  // Connect to MetaMask
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('MetaMask is not installed. Please install it to use this feature.');
      return;
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Get the first account
      const address = accounts[0];
      setWalletAddress(address);
      setWalletConnected(true);
      
      // Save to localStorage
      localStorage.setItem('walletAddress', address);
      
      // Listen for account changes
      window.ethereum.on('accountsChanged', function (accounts) {
        if (accounts.length === 0) {
          // User disconnected all accounts
          setWalletConnected(false);
          setWalletAddress('');
          localStorage.removeItem('walletAddress');
        } else {
          // User switched accounts
          setWalletAddress(accounts[0]);
          localStorage.setItem('walletAddress', accounts[0]);
        }
      });
    } catch (error) {
      console.error('Error connecting to MetaMask:', error);
    }
  };

  // Format wallet address for display
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
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
                  {/* MetaMask connection button for crypto investors */}
                  {isCryptoInvestor && !walletConnected && (
                    <button
                      onClick={connectWallet}
                      className={borderedButtonClass + " text-orange-600 hover:bg-white/6"} // consistent border + transparent bg
                    >
                      <svg className="w-4 h-4 mr-1" viewBox="0 0 35 33" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M32.9582 1L19.8241 10.7183L22.2665 5.09944L32.9582 1Z" fill="#E2761B" stroke="#E2761B" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2.65857 1L15.6948 10.809L13.3456 5.09944L2.65857 1Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M28.2031 23.5314L24.7152 28.8138L32.2261 30.8426L34.3838 23.6396L28.2031 23.5314Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M1.23291 23.6396L3.37902 30.8426L10.8899 28.8138L7.40203 23.5314L1.23291 23.6396Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M10.4808 14.5149L8.3577 17.6507L15.8105 17.9753L15.5494 9.98901L10.4808 14.5149Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M25.1205 14.5149L19.9684 9.8808L19.8246 17.9753L27.2659 17.6507L25.1205 14.5149Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M10.8899 28.8138L15.3304 26.6684L11.5037 23.6828L10.8899 28.8138Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M20.2769 26.6684L24.7152 28.8138L24.1014 23.6828L20.2769 26.6684Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Connect Wallet
                    </button>
                  )}
                  
                  {/* Show wallet address if connected */}
                  {isCryptoInvestor && walletConnected && (
                    <div className="flex items-center px-3 py-1.5 bg-gray-100 border border-gray-300 rounded">
                      <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                      <span className="text-xs font-medium text-gray-700">{formatAddress(walletAddress)}</span>
                    </div>
                  )}
                  
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
                {/* Mobile MetaMask connection button (flush, no divider) */}
                {isCryptoInvestor && !walletConnected && (
                  <button
                    onClick={connectWallet}
                    className="block w-full px-4 py-2 text-base font-medium rounded-md border border-gray-700 text-orange-400 bg-transparent hover:bg-gray-800 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2 inline-block" viewBox="0 0 35 33" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M32.9582 1L19.8241 10.7183L22.2665 5.09944L32.9582 1Z" fill="#E2761B" stroke="#E2761B" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2.65857 1L15.6948 10.809L13.3456 5.09944L2.65857 1Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M28.2031 23.5314L24.7152 28.8138L32.2261 30.8426L34.3838 23.6396L28.2031 23.5314Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M1.23291 23.6396L3.37902 30.8426L10.8899 28.8138L7.40203 23.5314L1.23291 23.6396Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M10.4808 14.5149L8.3577 17.6507L15.8105 17.9753L15.5494 9.98901L10.4808 14.5149Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M25.1205 14.5149L19.9684 9.8808L19.8246 17.9753L27.2659 17.6507L25.1205 14.5149Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M10.8899 28.8138L15.3304 26.6684L11.5037 23.6828L10.8899 28.8138Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M20.2769 26.6684L24.7152 28.8138L24.1014 23.6828L20.2769 26.6684Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Connect MetaMask Wallet
                  </button>
                )}

                {/* Show wallet address if connected (mobile) */}
                {isCryptoInvestor && walletConnected && (
                  <div className="block w-full px-4 py-2 text-base font-medium text-gray-300">
                    <div className="flex items-center">
                      <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                      <span>Wallet: {formatAddress(walletAddress)}</span>
                    </div>
                  </div>
                )}

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