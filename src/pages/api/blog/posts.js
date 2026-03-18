import { supabase } from '../../../utils/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const tab = req.query.tab || 'All';
    const category = req.query.category || 'All';
    const q = req.query.q || '';
    const page = parseInt(req.query.page || '1');
    const pageSize = parseInt(req.query.pageSize || '6');
    const offset = (page - 1) * pageSize;
    
    let conditions = {};
    
    if (tab === 'Videos') {
      conditions.kind = 'video';
    } else if (tab === 'Stories') {
      conditions.kind = 'article';
    }
    
    const { count, error: countError } = await supabase
      .from('blog_posts')
      .select('*', { count: 'exact', head: true })
      .match(conditions);
    
    if (countError) {
      console.error('Count error:', countError);
      return res.status(500).json({ error: 'Failed to count blog posts' });
    }
    
    const { data: posts, error: postsError } = await supabase
      .from('blog_posts')
      .select(`
        id, kind, post_id, slug, title, excerpt, 
        cover_url, cover_alt, cover_aspect_ratio,
        author_id, 
        date_published, neighborhood, price_range,
        duration_sec, featured, views, likes, loves, shares,
        youtube_url, html_content
      `)
      .match(conditions)
      .order('featured', { ascending: false })
      .order('date_published', { ascending: false })
      .range(offset, offset + pageSize - 1);
    
    if (postsError) {
      console.error('Posts query error:', postsError);
      return res.status(500).json({ error: 'Failed to retrieve blog posts' });
    }
    
    const postIds = posts.map(post => post.id);
    
    const { data: authors } = await supabase
      .from('authors')
      .select('id, name')
      .in('id', posts.map(p => p.author_id).filter(Boolean));
    
    const authorMap = (authors || []).reduce((map, author) => {
      map[author.id] = author;
      return map;
    }, {});
    
    const { data: categories } = await supabase
      .from('post_categories')
      .select('post_id, categories(name)')
      .in('post_id', postIds);
    
    const categoryMap = {};
    (categories || []).forEach(item => {
      if (!categoryMap[item.post_id]) categoryMap[item.post_id] = [];
      if (item.categories) categoryMap[item.post_id].push(item.categories.name);
    });
    
    const { data: tags } = await supabase
      .from('post_tags')
      .select('post_id, tags(name)')
      .in('post_id', postIds);
    
    const tagMap = {};
    (tags || []).forEach(item => {
      if (!tagMap[item.post_id]) tagMap[item.post_id] = [];
      if (item.tags) tagMap[item.post_id].push(item.tags.name);
    });
    
    const formattedPosts = (posts || []).map(post => ({
      kind: post.kind,
      id: post.post_id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      cover: {
        url: post.cover_url,
        alt: post.cover_alt,
        aspectRatio: post.cover_aspect_ratio,
      },
      categories: categoryMap[post.id] || [],
      tags: tagMap[post.id] || [],
      author: { 
        name: post.author_id && authorMap[post.author_id] 
          ? authorMap[post.author_id].name 
          : 'Unknown' 
      },
      datePublished: post.date_published,
      neighborhood: post.neighborhood,
      priceRange: post.price_range,
      durationSec: post.duration_sec,
      featured: post.featured,
      views: post.views,
      likes: post.likes,
      loves: post.loves,
      shares: post.shares,
      youtubeUrl: post.youtube_url,
      html: post.html_content,
    }));
    
    return res.status(200).json({
      posts: formattedPosts,
      pagination: {
        page: page,
        pageSize: pageSize,
        totalPages: Math.ceil(count / pageSize),
        totalItems: count
      }
    });
    
  } catch (error) {
    console.error('Error in blog posts API route:', error);
    return res.status(500).json({ error: 'Failed to retrieve blog posts' });
  }
}
