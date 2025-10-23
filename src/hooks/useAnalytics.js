import { useRouter } from 'next/router';
import { useEffect, useCallback } from 'react';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// Initialize dataLayer if it doesn't exist
if (typeof window !== 'undefined') {
  window.dataLayer = window.dataLayer || [];
}

// GTM helper function
const gtag = (...args) => {
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push(args);
  }
};

// Push events to dataLayer
const pushToDataLayer = (eventData) => {
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push(eventData);
  }
};

export const useAnalytics = () => {
  const router = useRouter();

  // Load GA script and initialize gtag
  useEffect(() => {
    if (!GA_MEASUREMENT_ID || typeof window === 'undefined') return;

    if (!document.querySelector(`script[data-gtag="ga-${GA_MEASUREMENT_ID}"]`)) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
      script.setAttribute('data-gtag', `ga-${GA_MEASUREMENT_ID}`);
      document.head.appendChild(script);
    }

    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID, {
      page_path: window.location.pathname,
    });
  }, [GA_MEASUREMENT_ID]);

  // Track page views on route change
  useEffect(() => {
    const handleRouteChange = (url) => {
      // Wait a bit for the page to load before tracking
      setTimeout(() => {
        pushToDataLayer({
          event: 'page_view',
          page_title: document.title,
          page_location: window.location.href,
          page_path: url,
          page_referrer: document.referrer,
          timestamp: new Date().toISOString(),
        });

        // Update GA config with new page path
        if (GA_MEASUREMENT_ID) {
          gtag('config', GA_MEASUREMENT_ID, {
            page_path: url,
          });
        }
      }, 100);
    };

    // Track initial page load
    handleRouteChange(router.asPath);

    // Listen for route changes
    router.events.on('routeChangeComplete', handleRouteChange);

    // Cleanup
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router, GA_MEASUREMENT_ID]);

  // Property-specific event tracking
  const trackPropertyView = useCallback((property) => {
    pushToDataLayer({
      event: 'view_property',
      property_id: property.id,
      property_type: property.type,
      property_city: property.city,
      property_price: property.price,
      property_bedrooms: property.bedrooms,
      property_bathrooms: property.bathrooms,
      property_sqft: property.sqft,
      value: property.price, // For conversion tracking
      currency: 'USD',
      timestamp: new Date().toISOString(),
    });
  }, []);

  const trackPropertySave = useCallback((property) => {
    pushToDataLayer({
      event: 'save_property',
      property_id: property.id,
      property_type: property.type,
      property_city: property.city,
      property_price: property.price,
      action_type: 'favorite',
      timestamp: new Date().toISOString(),
    });
  }, []);

  const trackPropertySearch = useCallback((searchParams) => {
    pushToDataLayer({
      event: 'search_property',
      search_term: searchParams.query || '',
      search_city: searchParams.city || '',
      search_property_type: searchParams.propertyType || '',
      search_min_price: searchParams.minPrice || '',
      search_max_price: searchParams.maxPrice || '',
      search_bedrooms: searchParams.bedrooms || '',
      search_bathrooms: searchParams.bathrooms || '',
      results_count: searchParams.resultsCount || 0,
      timestamp: new Date().toISOString(),
    });
  }, []);

  // Blog-specific event tracking
  const trackBlogPostView = useCallback((post) => {
    pushToDataLayer({
      event: 'view_blog_post',
      article_title: post.title,
      article_id: post.id,
      article_category: post.categories?.[0] || 'uncategorized',
      article_author: post.author?.name || 'unknown',
      article_published_date: post.datePublished,
      content_type: post.kind === 'video' ? 'video' : 'article',
      timestamp: new Date().toISOString(),
    });
  }, []);

  const trackBlogEngagement = useCallback((post, engagementType) => {
    pushToDataLayer({
      event: 'blog_engagement',
      article_title: post.title,
      article_id: post.id,
      engagement_type: engagementType, // like, love, share
      timestamp: new Date().toISOString(),
    });
  }, []);

  // Form tracking
  const trackFormSubmission = useCallback((formData) => {
    pushToDataLayer({
      event: 'form_submission',
      form_name: formData.formName,
      form_type: formData.formType, // contact, newsletter, property_inquiry
      form_location: formData.formLocation || window.location.pathname,
      lead_type: formData.leadType || 'general',
      timestamp: new Date().toISOString(),
    });
  }, []);

  // Contact tracking
  const trackContact = useCallback((contactData) => {
    pushToDataLayer({
      event: 'contact_agent',
      contact_method: contactData.method, // phone, email, form
      property_id: contactData.propertyId || '',
      agent_id: contactData.agentId || '',
      lead_source: contactData.source || 'website',
      value: contactData.estimatedValue || 0, // For conversion value
      currency: 'USD',
      timestamp: new Date().toISOString(),
    });
  }, []);

  // Scroll depth tracking
  const trackScrollDepth = useCallback((depth) => {
    pushToDataLayer({
      event: 'scroll_depth',
      scroll_depth: depth, // 25, 50, 75, 90
      page_path: router.asPath,
      timestamp: new Date().toISOString(),
    });
  }, [router.asPath]);

  // Outbound link tracking
  const trackOutboundLink = useCallback((url, linkText) => {
    pushToDataLayer({
      event: 'click_outbound_link',
      link_url: url,
      link_text: linkText,
      link_domain: new URL(url).hostname,
      source_page: window.location.pathname,
      timestamp: new Date().toISOString(),
    });
  }, []);

  // Generic event tracking
  const trackEvent = useCallback((eventName, eventData = {}) => {
    pushToDataLayer({
      event: eventName,
      ...eventData,
      timestamp: new Date().toISOString(),
    });
  }, []);

  return {
    // Property events
    trackPropertyView,
    trackPropertySave,
    trackPropertySearch,
    
    // Blog events
    trackBlogPostView,
    trackBlogEngagement,
    
    // Form and contact events
    trackFormSubmission,
    trackContact,
    
    // User interaction events
    trackScrollDepth,
    trackOutboundLink,
    
    // Generic event tracking
    trackEvent,
    
    // Direct dataLayer access
    pushToDataLayer,
  };
};

// Export individual functions for non-hook usage
export {
  pushToDataLayer,
  gtag,
};
