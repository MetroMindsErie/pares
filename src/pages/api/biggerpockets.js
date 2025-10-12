import Parser from 'rss-parser';

// In-memory cache with 15-minute lifetime
let cache = {
  data: null,
  timestamp: null,
  ttl: 15 * 60 * 1000, // 15 minutes in milliseconds
};

// Initialize RSS parser with custom field mappings
const parser = new Parser({
  customFields: {
    item: [
      ['dc:creator', 'author'],
      ['content:encoded', 'content'],
      ['media:thumbnail', 'thumbnail'],
    ],
  },
});

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if we have valid cached data
    const now = Date.now();
    if (cache.data && cache.timestamp && (now - cache.timestamp) < cache.ttl) {
      console.log('Serving BiggerPockets data from cache');
      return res.status(200).json(cache.data);
    }

    console.log('Fetching fresh BiggerPockets RSS data');
    
    // Fetch and parse the RSS feed
    const feed = await parser.parseURL('https://www.biggerpockets.com/blog/feed');
    
    // Format the posts to match our expected structure
    const posts = feed.items.slice(0, 10).map((item, index) => ({
      id: `bp_${index}_${Date.now()}`, // Unique ID for React keys
      title: item.title || 'Untitled Post',
      link: item.link || '',
      pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
      contentSnippet: item.contentSnippet || item.content?.replace(/<[^>]*>/g, '')?.substring(0, 200) || '',
      author: item.author || item['dc:creator'] || 'BiggerPockets',
      source: 'biggerpockets',
      thumbnail: item.thumbnail?.url || null,
    }));

    // Update cache
    cache.data = {
      posts,
      fetchedAt: new Date().toISOString(),
      source: 'BiggerPockets RSS Feed',
    };
    cache.timestamp = now;

    res.status(200).json(cache.data);
  } catch (error) {
    console.error('Error fetching BiggerPockets RSS feed:', error);
    
    // Return cached data if available, even if stale
    if (cache.data) {
      console.log('Serving stale cache due to fetch error');
      return res.status(200).json({
        ...cache.data,
        warning: 'Data may be outdated due to fetch error',
      });
    }

    // No cache available, return error
    res.status(500).json({
      error: 'Failed to fetch BiggerPockets RSS feed',
      posts: [],
      source: 'BiggerPockets RSS Feed',
    });
  }
}
