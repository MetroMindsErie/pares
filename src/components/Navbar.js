import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useAuth } from '../context/auth-context';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth(); // Changed from signOut to logout
  const router = useRouter();
  // Close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [router.pathname]);

  return (
    <nav className="bg-white shadow-md z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="font-serif text-2xl text-blue-700 hover:text-blue-900 transition duration-300">
                Pares
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link 
                href="/" 
                className={`inline-flex items-center px-1 pt-1 border-b-2 ${
                  router.pathname === '/' 
                    ? 'border-blue-500 text-gray-900' 
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } text-sm font-medium`}
              >
                Home
              </Link>
              <Link 
                href="/properties" 
                className={`inline-flex items-center px-1 pt-1 border-b-2 ${
                  router.pathname === '/properties' 
                    ? 'border-blue-500 text-gray-900' 
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } text-sm font-medium`}
              >
                Properties
              </Link>
              <Link 
                href="/agents" 
                className={`inline-flex items-center px-1 pt-1 border-b-2 ${
                  router.pathname === '/agents' 
                    ? 'border-blue-500 text-gray-900' 
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } text-sm font-medium`}
              >
                Agents
              </Link>
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {isAuthenticated ? (
              <div className="ml-3 relative flex items-center space-x-4">
                <Link 
                  href="/dashboard" 
                  className="text-gray-600 hover:text-gray-900"
                >
                  Dashboard
                </Link>
                <Link 
                  href="/profile" 
                  className="text-gray-600 hover:text-gray-900"
                >
                  Profile
                </Link>
                <button
                  onClick={() => logout()} // Changed from signOut to logout
                  className="text-gray-600 hover:text-gray-900"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="space-x-4">
                <Link 
                  href="/login" 
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50"
                >
                  Log in
                </Link>
                <Link 
                  href="/register" 
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
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
      <div className={`${isOpen ? 'block' : 'hidden'} sm:hidden`}>
        <div className="pt-2 pb-3 space-y-1">
          <Link 
            href="/" 
            className={`block pl-3 pr-4 py-2 border-l-4 ${
              router.pathname === '/' 
                ? 'border-blue-500 text-blue-700 bg-blue-50' 
                : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
            } text-base font-medium`}
          >
            Home
          </Link>
          <Link 
            href="/properties" 
            className={`block pl-3 pr-4 py-2 border-l-4 ${
              router.pathname === '/properties' 
                ? 'border-blue-500 text-blue-700 bg-blue-50' 
                : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
            } text-base font-medium`}
          >
            Properties
          </Link>
          <Link 
            href="/agents" 
            className={`block pl-3 pr-4 py-2 border-l-4 ${
              router.pathname === '/agents' 
                ? 'border-blue-500 text-blue-700 bg-blue-50' 
                : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
            } text-base font-medium`}
          >
            Agents
          </Link>
        </div>
        <div className="pt-4 pb-3 border-t border-gray-200">
          {isAuthenticated ? (
            <div className="space-y-1">
              <Link 
                href="/dashboard" 
                className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 text-base font-medium"
              >
                Dashboard
              </Link>
              <Link 
                href="/profile" 
                className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 text-base font-medium"
              >
                Profile
              </Link>
              <button
                onClick={() => logout()} // Changed from signOut to logout
                className="block w-full text-left pl-3 pr-4 py-2 border-l-4 border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 text-base font-medium"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <Link 
                href="/login" 
                className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 text-base font-medium"
              >
                Log in
              </Link>
              <Link 
                href="/register" 
                className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 text-base font-medium"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}