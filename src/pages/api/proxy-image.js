/**
 * API route that acts as a proxy for fetching images from external sources
 * This helps bypass CORS restrictions when fetching Facebook profile pictures
 */
export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer();
    
    // Get content type from original response
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    
    // Send the image data
    res.status(200).send(Buffer.from(imageBuffer));
  } catch (error) {
    console.error('Proxy image error:', error);
    res.status(500).json({ error: 'Failed to proxy image' });
  }
}
