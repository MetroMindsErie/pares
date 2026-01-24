/**
 * Extract the primary/preferred photo from a property's Media array
 * This ensures all thumbnails across the site show the preferred exterior photo
 * 
 * @param {Array} mediaArray - Array of media objects with MediaURL and PreferredPhotoYN
 * @returns {string} URL of the primary photo or fallback image
 */
export function getPrimaryPhotoUrl(mediaArray) {
  if (!Array.isArray(mediaArray) || mediaArray.length === 0) {
    return '/fallback-property.jpg';
  }

  // 1. Look for explicitly marked preferred photo
  const preferred = mediaArray.find(
    (m) => m?.PreferredPhotoYN === true || 
           m?.PreferredPhotoYN === 'Y' || 
           m?.PreferredPhotoYN === 'Yes' ||
           m?.PreferredPhotoYN === 'yes'
  );

  if (preferred?.MediaURL) {
    return preferred.MediaURL;
  }

  // 2. Fall back to first photo sorted by Order
  const sorted = mediaArray
    .slice()
    .sort((a, b) => {
      if (a?.Order !== undefined && b?.Order !== undefined) {
        return a.Order - b.Order;
      }
      return 0;
    });

  const firstMedia = sorted[0];
  if (firstMedia?.MediaURL) {
    return firstMedia.MediaURL;
  }

  // 3. Last resort fallback
  return '/fallback-property.jpg';
}

/**
 * Get all media URLs sorted by Order (for image galleries)
 * 
 * @param {Array} mediaArray - Array of media objects
 * @returns {Array<string>} Array of media URLs
 */
export function getMediaUrls(mediaArray) {
  if (!Array.isArray(mediaArray) || mediaArray.length === 0) {
    return ['/fallback-property.jpg'];
  }

  const urls = mediaArray
    .slice()
    .sort((a, b) => {
      if (a?.Order !== undefined && b?.Order !== undefined) {
        return a.Order - b.Order;
      }
      return 0;
    })
    .map((m) => m?.MediaURL)
    .filter((url) => url && String(url).startsWith('http'));

  return urls.length > 0 ? urls : ['/fallback-property.jpg'];
}
