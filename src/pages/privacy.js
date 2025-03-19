import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../components/Layout';

export default function PrivacyPolicy() {
  return (
    <Layout>
      <Head>
        <title>Privacy Policy | Pares Real Estate Solutions</title>
        <meta name="description" content="Privacy Policy for Pares Real Estate Solutions" />
      </Head>

      {/* Breadcrumb Navigation */}
      <div className="bg-gray-50 border-b">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-4">
              <li>
                <div>
                  <Link href="/" className="text-gray-400 hover:text-gray-500">
                    <svg className="flex-shrink-0 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                    </svg>
                    <span className="sr-only">Home</span>
                  </Link>
                </div>
              </li>
              <li>
                <div className="flex items-center">
                  <svg className="flex-shrink-0 h-5 w-5 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
                  </svg>
                  <span className="ml-4 text-sm font-medium text-gray-500" aria-current="page">Privacy Policy</span>
                </div>
              </li>
            </ol>
          </nav>
        </div>
      </div>

      <main className="bg-white">
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
            <div className="h-1 w-24 bg-blue-600 mx-auto"></div>
          </div>

          <div className="prose prose-blue prose-lg max-w-none">
            <p className="text-lg text-gray-700 leading-relaxed mb-8">
              We respect your privacy and are committed to protecting your personal information. 
              This Policy explains how we collect, use, and disclose any data you provide while 
              using our services. By using our website, you consent to the practices described here.
            </p>

            <div className="bg-white shadow-md rounded-lg p-6 mb-8 border-l-4 border-blue-600">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Data Collection</h2>
              <p className="text-gray-700">
                We may collect basic user information such as email addresses to enable certain
                features. We receive additional data (like public profile and email) from 
                third-party login providers, including Facebook. Information is stored securely 
                on our servers and is used only to provide or improve our services.
              </p>
            </div>

            <div className="bg-white shadow-md rounded-lg p-6 mb-8 border-l-4 border-blue-600">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Use of Data</h2>
              <p className="text-gray-700">
                Data collected helps us personalize user experiences and facilitate secure login. We 
                do not sell or share your information with unaffiliated parties unless required by law.
              </p>
            </div>

            <div className="bg-white shadow-md rounded-lg p-6 mb-8 border-l-4 border-blue-600">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Cookies & Tracking</h2>
              <p className="text-gray-700">
                We may use cookies or similar technologies to enhance user experience, 
                remember preferences, and analyze site usage. You can control cookie settings through
                your browser preferences.
              </p>
            </div>

            <div className="bg-white shadow-md rounded-lg p-6 mb-8 border-l-4 border-blue-600">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Third-Party Services</h2>
              <p className="text-gray-700">
                Our service may integrate with third-party providers (e.g., Facebook). Their 
                policies govern the data they collect. We recommend reviewing their terms for 
                full details.
              </p>
              <div className="mt-4 p-4 bg-blue-50 rounded-md">
                <h3 className="font-medium text-blue-800 mb-2">Facebook Integration</h3>
                <p className="text-sm text-blue-700">
                  When you connect with Facebook, we receive information according to the permissions
                  you grant. This typically includes your public profile and email address.
                  We never post to your Facebook account without your explicit permission.
                </p>
              </div>
            </div>

            <div className="bg-white shadow-md rounded-lg p-6 mb-8 border-l-4 border-blue-600">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Policy Updates</h2>
              <p className="text-gray-700">
                We may update this Policy to reflect changes. Continued use of our website 
                after updates signifies acceptance of the revised Policy. We will notify users
                of significant changes through our website or email if appropriate.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 shadow-inner">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Contact Us</h2>
              <p className="text-gray-700 mb-6">
                For questions about this Privacy Policy, please email:
              </p>
              <a 
                href="mailto:support@parealestatesolutions.com" 
                className="text-blue-600 hover:text-blue-800 font-medium flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                support@parealestatesolutions.com
              </a>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-center">
              <p className="text-sm text-gray-500 mb-4 sm:mb-0">
                Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
              <div className="flex space-x-4">
                <Link 
                  href="/" 
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Home
                </Link>
                <Link 
                  href="/terms" 
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Terms of Service
                </Link>
                <Link 
                  href="/contact" 
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Contact
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}
