import React from 'react';
import Link from 'next/link';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Column 1: Logo and description */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="inline-flex items-center">
              <span className="text-2xl font-semibold text-white">Pares</span>
            </Link>
            <p className="mt-4 text-gray-400 text-sm max-w-xs">
              PA Real Estate Solutions provides innovative tools for real estate professionals and investors, making property transactions simpler and more accessible.
            </p>
            <div className="mt-6 flex space-x-4">
              {/* Social Media Icons */}
              <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">
                <span className="sr-only">Facebook</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                </svg>
              </a>
              {/* ...existing social icons... */}
            </div>
          </div>
          
          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 tracking-wider uppercase">
              Explore
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                  Properties
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                  Agents
                </Link>
              </li>
              {/* ...existing links... */}
            </ul>
          </div>
                <div>
                <h3 className="text-sm font-semibold text-gray-300 tracking-wider uppercase">
                  Resources
                </h3>
                <ul className="mt-4 space-y-2">
                  <li>
                  <a href="#" onClick={(e) => e.preventDefault()} className="text-gray-400 hover:text-white transition-colors">
                    Blog Coming Soon
                  </a>
                  </li>
                  <li>
                  <a href="#" onClick={(e) => e.preventDefault()} className="text-gray-400 hover:text-white transition-colors">
                    FAQ Coming Soon
                  </a>
                  </li>
                  {/* ...existing links... */}
            </ul>
          </div>
        </div>
        
        {/* Legal Section with Privacy Policy Link */}
        <div className="mt-12 pt-8 border-t border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © {currentYear} Pares Real Estate Solutions. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/privacy" className="text-gray-400 hover:text-white text-sm transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-white text-sm transition-colors">
                Terms of Service
              </Link>
              <Link href="/contact" className="text-gray-400 hover:text-white text-sm transition-colors">
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;