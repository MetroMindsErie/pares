import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/Navbar'; // Import the Navbar component
import { useRouter } from 'next/router'; // Import router for active path detection

export default function TermsOfService() {
  const router = useRouter();
  
  // Theme colors and styles should match your site's global theme
  const theme = {
    primary: '#3f51b5',
    secondary: '#f50057',
    text: '#333333',
    lightText: '#666666',
    background: '#ffffff',
    lightBackground: '#f5f5f5',
    borderColor: '#e0e0e0',
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  };
  
  const containerStyle = {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
  };
  
  const titleStyle = {
    fontSize: '2rem',
    fontWeight: 'bold',
    marginBottom: '10px',
    color: theme.text,
  };
  
  const subtitleStyle = {
    color: theme.lightText,
    marginBottom: '15px',
    fontSize: '1rem',
  };
  
  const dividerStyle = {
    margin: '20px 0',
    border: '0',
    borderTop: `1px solid ${theme.borderColor}`,
  };
  
  const sectionStyle = {
    marginBottom: '30px',
  };
  
  const sectionTitleStyle = {
    fontSize: '1.5rem',
    marginBottom: '15px',
    color: theme.primary,
  };
  
  const paragraphStyle = {
    lineHeight: '1.6',
    marginBottom: '15px',
  };
  
  const listStyle = {
    paddingLeft: '25px',
    margin: '10px 0',
    lineHeight: '1.6',
  };
  
  const footerStyle = {
    borderTop: `1px solid ${theme.borderColor}`,
    padding: '20px',
    backgroundColor: theme.lightBackground,
    textAlign: 'center',
    color: theme.lightText,
    fontSize: '0.875rem',
    fontFamily: theme.fontFamily,
  };
  
  const footerLinkStyle = {
    color: theme.primary,
    textDecoration: 'none',
    marginRight: '20px',
  };
  
  const footerLinkLastStyle = {
    color: theme.primary,
    textDecoration: 'none',
  };

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      Head,
      null,
      React.createElement('title', null, 'Terms of Service | Pares'),
      React.createElement('meta', { name: 'description', content: 'Terms of Service for Pares' })
    ),
    
    // Use Navbar component consistently with other pages
    React.createElement(Navbar, { 
      currentPath: router.pathname, // Automatically determine current path
      // Do not pass custom styling here - let the Navbar component handle its own styling
      // for consistency across the entire website
    }),
    
    // Main content
    React.createElement(
      'div',
      { style: containerStyle },
      React.createElement(
        'h1',
        { style: titleStyle },
        'Terms of Service'
      ),
      React.createElement(
        'p',
        { style: subtitleStyle },
        'Last Updated: ' + new Date().toLocaleDateString()
      ),
      React.createElement('hr', { style: dividerStyle }),
      
      // Section 1: Introduction
      React.createElement(
        'div',
        { style: sectionStyle },
        React.createElement(
          'h2',
          { style: sectionTitleStyle },
          '1. Introduction'
        ),
        React.createElement(
          'p',
          { style: paragraphStyle },
          'Welcome to Pares. By accessing or using our service, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access our service.'
        )
      ),
      
      // Section 2: User Accounts
      React.createElement(
        'div',
        { style: sectionStyle },
        React.createElement(
          'h2',
          { style: sectionTitleStyle },
          '2. User Accounts'
        ),
        React.createElement(
          'p',
          { style: paragraphStyle },
          'When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account.'
        ),
        React.createElement(
          'p',
          { style: paragraphStyle },
          'You are responsible for safeguarding the password that you use to access the service and for any activities or actions under your password.'
        )
      ),
      
      // Section 3: Content Ownership
      React.createElement(
        'div',
        { style: sectionStyle },
        React.createElement(
          'h2',
          { style: sectionTitleStyle },
          '3. Content Ownership'
        ),
        React.createElement(
          'p',
          { style: paragraphStyle },
          'You retain all rights to content that you upload, post, or share on our service. By posting content, you grant us a non-exclusive, transferable, sub-licensable, royalty-free, worldwide license to use, copy, modify, and distribute your content.'
        ),
        React.createElement(
          'p',
          { style: paragraphStyle },
          'You may delete your content at any time, at which point the license ends. However, content may remain in backup copies for a reasonable period of time.'
        )
      ),
      
      // Section 4: Data Deletion
      React.createElement(
        'div',
        { style: sectionStyle },
        React.createElement(
          'h2',
          { style: sectionTitleStyle },
          '4. Data Deletion'
        ),
        React.createElement(
          'p',
          { style: paragraphStyle },
          'You may request deletion of your account and personal data at any time. We will process such requests within 30 days.'
        ),
        React.createElement(
          'p',
          { style: paragraphStyle },
          'If you\'ve used Facebook to create or access your account, you may also request deletion of your data through Facebook\'s data deletion request process. When we receive such requests from Facebook, we will delete all information associated with the Facebook account.'
        ),
        React.createElement(
          'p',
          { style: paragraphStyle },
          'Deletion may not remove data from our backup systems, which will be removed according to our backup rotation schedule.'
        )
      ),
      
      // Section 5: Third-Party Authentication
      React.createElement(
        'div',
        { style: sectionStyle },
        React.createElement(
          'h2',
          { style: sectionTitleStyle },
          '5. Third-Party Authentication'
        ),
        React.createElement(
          'p',
          { style: paragraphStyle },
          'Our service may allow you to authenticate using third-party services such as Facebook, Google, or others. Your use of these third-party services is subject to their respective terms of service and privacy policies.'
        )
      ),
      
      // Section 6: Prohibited Uses
      React.createElement(
        'div',
        { style: sectionStyle },
        React.createElement(
          'h2',
          { style: sectionTitleStyle },
          '6. Prohibited Uses'
        ),
        React.createElement(
          'p',
          { style: paragraphStyle },
          'You agree not to use our service for any unlawful purposes or to conduct any unlawful activity, including, but not limited to:'
        ),
        React.createElement(
          'ul',
          { style: listStyle },
          React.createElement('li', null, 'Fraudulent activities or violating any local, state, national, or international law'),
          React.createElement('li', null, 'Harassing, abusing, or harming another person'),
          React.createElement('li', null, 'Impersonating another user or person'),
          React.createElement('li', null, 'Posting content that is defamatory, obscene, or otherwise objectionable')
        )
      ),
      
      // Section 7: Termination
      React.createElement(
        'div',
        { style: sectionStyle },
        React.createElement(
          'h2',
          { style: sectionTitleStyle },
          '7. Termination'
        ),
        React.createElement(
          'p',
          { style: paragraphStyle },
          'We may terminate or suspend your account immediately, without prior notice or liability, for any reason, including, without limitation, if you breach the Terms.'
        ),
        React.createElement(
          'p',
          { style: paragraphStyle },
          'Upon termination, your right to use the service will immediately cease. If you wish to terminate your account, you may simply discontinue using the service or request account deletion.'
        )
      ),
      
      // Section 8: Limitation of Liability
      React.createElement(
        'div',
        { style: sectionStyle },
        React.createElement(
          'h2',
          { style: sectionTitleStyle },
          '8. Limitation of Liability'
        ),
        React.createElement(
          'p',
          { style: paragraphStyle },
          'In no event shall Pares, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the service.'
        )
      ),
      
      // Section 9: Changes to Terms
      React.createElement(
        'div',
        { style: sectionStyle },
        React.createElement(
          'h2',
          { style: sectionTitleStyle },
          '9. Changes to Terms'
        ),
        React.createElement(
          'p',
          { style: paragraphStyle },
          'We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days\' notice prior to any new terms taking effect.'
        ),
        React.createElement(
          'p',
          { style: paragraphStyle },
          'By continuing to access or use our service after those revisions become effective, you agree to be bound by the revised terms.'
        )
      ),
      
      // Section 10: Contact Us
      React.createElement(
        'div',
        { style: sectionStyle },
        React.createElement(
          'h2',
          { style: sectionTitleStyle },
          '10. Contact Us'
        ),
        React.createElement(
          'p',
          { style: paragraphStyle },
          'If you have any questions about these Terms, please contact us at support@example.com.'
        )
      ),
      
      // Footer 
      React.createElement(
        'footer',
        { style: footerStyle },
        React.createElement(
          'p',
          null,
          '© ' + new Date().getFullYear() + ' Pares. All rights reserved.'
        ),
        React.createElement(
          'p',
          null,
          React.createElement(Link, { href: '/privacy-policy', style: footerLinkStyle }, 'Privacy Policy'),
          React.createElement(Link, { href: '/terms-of-service', style: footerLinkLastStyle }, 'Terms of Service')
        )
      )
    )
  );
}
