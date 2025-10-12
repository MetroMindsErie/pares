/**
 * Utility functions for date formatting and content processing
 */

// Format date consistently across both Supabase and RSS posts
export function formatPostDate(dateString) {
  if (!dateString) return 'Unknown date';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Unknown date';
  }
}

// Truncate content snippets to a consistent length
export function truncateSnippet(text, maxLength = 150) {
  if (!text) return '';
  
  if (text.length <= maxLength) return text;
  
  // Find the last complete word within the limit
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  return lastSpace > 0 
    ? truncated.substring(0, lastSpace) + '...'
    : truncated + '...';
}

// Get relative time (e.g., "2 days ago")
export function getRelativeTime(dateString) {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    
    return `${Math.floor(diffDays / 365)} years ago`;
  } catch (error) {
    console.error('Error calculating relative time:', error);
    return '';
  }
}

// Extract domain from URL for source attribution
export function extractDomain(url) {
  if (!url) return '';
  
  try {
    const domain = new URL(url).hostname;
    return domain.replace('www.', '');
  } catch (error) {
    return '';
  }
}
