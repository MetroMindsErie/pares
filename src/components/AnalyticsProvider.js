import { useEffect, useState } from 'react';
import { useAnalytics } from '../hooks/useAnalytics';

export default function AnalyticsProvider({ children }) {
  const { trackScrollDepth, trackOutboundLink } = useAnalytics();
  const [scrollDepthTracked, setScrollDepthTracked] = useState({});

  useEffect(() => {
    // Scroll depth tracking
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = Math.round((scrollTop / documentHeight) * 100);

      // Track at 25%, 50%, 75%, and 90% scroll depths
      const depths = [25, 50, 75, 90];
      depths.forEach(depth => {
        if (scrollPercent >= depth && !scrollDepthTracked[depth]) {
          trackScrollDepth(depth);
          setScrollDepthTracked(prev => ({ ...prev, [depth]: true }));
        }
      });
    };

    // Outbound link tracking
    const handleClick = (event) => {
      const link = event.target.closest('a');
      if (link && link.href) {
        const url = link.href;
        const currentDomain = window.location.hostname;
        
        try {
          const linkDomain = new URL(url).hostname;
          
          // Track if it's an external link
          if (linkDomain !== currentDomain && !linkDomain.includes(currentDomain)) {
            trackOutboundLink(url, link.textContent || link.getAttribute('aria-label') || 'Unknown');
          }
        } catch (e) {
          // Invalid URL, skip tracking
        }
      }
    };

    // Add event listeners
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('click', handleClick);

    // Cleanup
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('click', handleClick);
    };
  }, [trackScrollDepth, trackOutboundLink, scrollDepthTracked]);

  // Reset scroll tracking on route changes
  useEffect(() => {
    setScrollDepthTracked({});
  }, []);

  return <>{children}</>;
}
