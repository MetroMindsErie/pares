import React from 'react';
import Head from 'next/head';
import Navbar from '../components/Navbar';

export default function DataDeletionInstructions() {
  return (
    <>
      <Head>
        <title>Data Deletion Instructions | Pares</title>
        <meta name="description" content="Instructions for deleting your data from the Pares platform" />
      </Head>

      <Navbar />
      
      <main className="bg-gradient-to-b from-gray-50 to-white min-h-screen">
        <div className="max-w-4xl mx-auto pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="bg-teal-600 px-6 py-4">
              <h1 className="text-3xl font-bold text-white">Data Deletion Instructions</h1>
            </div>
            
            <div className="p-6 sm:p-8">
              <p className="text-gray-700 mb-6">
                We value your privacy and make it easy to delete your data from our platform. 
                If you'd like to delete your account and all associated data, please follow these steps:
              </p>
              
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-teal-700 mb-3">Option 1: Delete through your account settings</h2>
                <ol className="list-decimal pl-6 text-gray-700 space-y-2">
                  <li>Log in to your account</li>
                  <li>Navigate to Account Settings</li>
                  <li>Scroll to the bottom and click on "Delete My Account"</li>
                  <li>Confirm your decision by following the prompts</li>
                </ol>
              </div>

              <div className="mb-8">
                <h2 className="text-xl font-semibold text-teal-700 mb-3">Option 2: Contact us directly</h2>
                <p className="text-gray-700">If you're having trouble deleting your account through your settings, you can send an email to:</p>
                <p className="my-2">
                  <a href="mailto:privacy@pares.com" className="text-teal-600 hover:text-teal-800 font-medium">
                    privacy@pares.com
                  </a>
                </p>
                <p className="text-gray-700">Please include the subject line "Account Deletion Request" and provide the email address associated with your account.</p>
              </div>

              <div className="mb-8">
                <h2 className="text-xl font-semibold text-teal-700 mb-3">What happens when you delete your account</h2>
                <p className="text-gray-700 mb-3">When you delete your account, we will:</p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li>Permanently delete your profile information</li>
                  <li>Remove all content you've created including reels and posts</li>
                  <li>Delete your personal information from our databases</li>
                  <li>Revoke all access tokens and authentication credentials</li>
                </ul>
                
                <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mt-4">
                  <p className="text-sm text-teal-700">
                    <strong>Note:</strong> Some information might be retained in our backup systems for a limited period, 
                    but these are automatically purged according to our data retention policies.
                  </p>
                </div>
              </div>
              
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-teal-700 mb-3">Data from Facebook</h2>
                <p className="text-gray-700 mb-3">If you've connected your Facebook account to our platform and wish to revoke access or delete associated data:</p>
                <ol className="list-decimal pl-6 text-gray-700 space-y-2">
                  <li>Go to your <a href="https://www.facebook.com/settings?tab=applications" 
                     className="text-teal-600 hover:text-teal-800" 
                     target="_blank" 
                     rel="noopener noreferrer">Facebook App Settings</a></li>
                  <li>Find our app in the list and click "Remove"</li>
                  <li>Follow any additional prompts to confirm the removal</li>
                </ol>
              </div>
              
              <hr className="my-8 border-gray-200" />
              
              <p className="text-gray-700">
                If you have any questions about data deletion, please contact our privacy team at 
                <a href="mailto:privacy@pares.com" className="text-teal-600 hover:text-teal-800 mx-1">privacy@pares.com</a>.
              </p>
              
              <p className="text-xs text-gray-500 mt-8">
                Last updated: {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
