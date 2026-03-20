// In-memory cache with 15-minute lifetime
let cache = {
  data: null,
  timestamp: null,
  ttl: 15 * 60 * 1000, // 15 minutes in milliseconds
};

// Simple XML text extractor — grabs inner text of a tag
function getTag(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
  const m = xml.match(re);
  return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';
}

// Parse RSS XML into items using basic string matching
function parseRss(xml) {
  const items = [];
  const parts = xml.split('<item>').slice(1); // skip everything before first <item>
  for (const part of parts) {
    const itemXml = part.split('</item>')[0];
    items.push({
      title: getTag(itemXml, 'title'),
      link: getTag(itemXml, 'link'),
      pubDate: getTag(itemXml, 'pubDate'),
      author: getTag(itemXml, 'dc:creator'),
      contentSnippet: getTag(itemXml, 'description')
        .replace(/<[^>]*>/g, '')
        .substring(0, 200),
    });
  }
  return items;
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export default async function handler(req) {
  if (req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const now = Date.now();
    if (cache.data && cache.timestamp && (now - cache.timestamp) < cache.ttl) {
      return json(cache.data);
    }

    const feedRes = await fetch('https://www.biggerpockets.com/blog/feed');
    if (!feedRes.ok) throw new Error(`RSS fetch failed: ${feedRes.status}`);
    const xml = await feedRes.text();
    const items = parseRss(xml);

    const posts = items.slice(0, 10).map((item, index) => ({
      id: `bp_${index}_${Date.now()}`,
      title: item.title || 'Untitled Post',
      link: item.link || '',
      pubDate: item.pubDate || new Date().toISOString(),
      contentSnippet: item.contentSnippet || '',
      author: item.author || 'BiggerPockets',
      source: 'biggerpockets',
    }));

    cache.data = {
      posts,
      fetchedAt: new Date().toISOString(),
      source: 'BiggerPockets RSS Feed',
    };
    cache.timestamp = now;

    return json(cache.data);
  } catch (error) {
    console.error('Error fetching BiggerPockets RSS feed:', error);

    if (cache.data) {
      return json({
        ...cache.data,
        warning: 'Data may be outdated due to fetch error',
      });
    }

    return json({
      error: 'Failed to fetch BiggerPockets RSS feed',
      posts: [],
      source: 'BiggerPockets RSS Feed',
    }, 500);
  }
}

export const runtime = 'edge';
