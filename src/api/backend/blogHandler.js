/**
 * Server-side handler for blog API endpoints
 */
import { supabaseClient } from '../../utils/supabaseClient';

// Handler to get all blog posts with filtering
export async function getPosts(req, res) {
  const { tab = 'All', category = 'All', q = '', page = 1, pageSize = 6 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  
  try {
    let query = supabaseClient
      .from('blog_posts')
      .select(`
        id, kind, post_id, slug, title, excerpt, 
        cover_url, cover_alt, cover_aspect_ratio,
        authors:author_id(name), 
        date_published, neighborhood, price_range,
        duration_sec, featured, views, likes, loves, shares,
        youtube_url, html_content,
        categories:post_categories(categories(name)),
        tags:post_tags(tags(name))
      `);
    
    // Filter by tab (post type)
    if (tab === 'Videos') {
      query = query.eq('kind', 'video');
    } else if (tab === 'Stories') {
      query = query.eq('kind', 'article');
    }
    
    // Filter by category
    if (category !== 'All') {
      query = query.eq('post_categories.categories.name', category);
    }
    
    // Filter by search query
    if (q) {
      query = query.or(
        `title.ilike.%${q}%,excerpt.ilike.%${q}%,neighborhood.ilike.%${q}%,post_tags.tags.name.ilike.%${q}%`
      );
    }
    
    // Order by featured and date
    query = query.order('featured', { ascending: false }).order('date_published', { ascending: false });
    
    // Add pagination
    const countQuery = query.count();
    query = query.range(offset, offset + parseInt(pageSize) - 1);
    
    // Execute both queries
    const [{ data: posts, error: postsError }, { count, error: countError }] = await Promise.all([
      query,
      countQuery
    ]);
    
    if (postsError) throw postsError;
    if (countError) throw countError;
    
    // Format response
    const formattedPosts = (posts || []).map(formatPostForResponse);
    
    return res.json({
      posts: formattedPosts,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(count / parseInt(pageSize)),
        totalItems: count
      }
    });
    
  } catch (error) {
    console.error('Error fetching posts:', error);
    return res.status(500).json({ error: 'Failed to retrieve blog posts' });
  }
}

// Handler to get a single post by ID or slug
export async function getPost(req, res) {
  const { identifier } = req.params;
  
  try {
    const { data: post, error } = await supabaseClient
      .from('blog_posts')
      .select(`
        id, kind, post_id, slug, title, excerpt, 
        cover_url, cover_alt, cover_aspect_ratio,
        authors:author_id(name), 
        date_published, neighborhood, price_range,
        duration_sec, featured, views, likes, loves, shares,
        youtube_url, html_content,
        categories:post_categories(categories(name)),
        tags:post_tags(tags(name))
      `)
      .or(`post_id.eq.${identifier},slug.eq.${identifier}`)
      .single();
    
    if (error) throw error;
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    return res.json(formatPostForResponse(post));
  } catch (error) {
    console.error('Error fetching post:', error);
    return res.status(500).json({ error: 'Failed to retrieve blog post' });
  }
}

// Handler to register engagement (view, like, love, share)
export async function engageWithPost(req, res) {
  const { postId } = req.params;
  const { engagementType } = req.body;
  const userId = req.session?.userId || req.ip; // Use session ID or IP as user identifier
  
  if (!['view', 'like', 'love', 'share'].includes(engagementType)) {
    return res.status(400).json({ error: 'Invalid engagement type' });
  }
  
  try {
    // Get the post's internal ID
    const { data: post, error: postError } = await supabaseClient
      .from('blog_posts')
      .select('id')
      .eq('post_id', postId)
      .single();
      
    if (postError || !post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Start a transaction using RPC function
    const { error: engageError } = await supabaseClient.rpc('engage_with_post', {
      p_post_id: post.id, 
      p_user_id: userId,
      p_type: engagementType
    });
    
    if (engageError) throw engageError;
    
    // Get updated counts
    const { data: counts, error: countsError } = await supabaseClient
      .from('blog_posts')
      .select('views, likes, loves, shares')
      .eq('id', post.id)
      .single();
      
    if (countsError) throw countsError;
    
    return res.json(counts);
  } catch (error) {
    console.error(`Error recording ${engagementType}:`, error);
    return res.status(500).json({ error: `Failed to record ${engagementType}` });
  }
}

// Helper function to format post data for response
function formatPostForResponse(row) {
  return {
    kind: row.kind,
    id: row.post_id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    cover: {
      url: row.cover_url,
      alt: row.cover_alt,
      aspectRatio: row.cover_aspect_ratio,
    },
    categories: row.categories.map(c => c.categories.name),
    tags: row.tags.map(t => t.tags.name),
    author: { name: row.authors.name },
    datePublished: row.date_published,
    neighborhood: row.neighborhood,
    priceRange: row.price_range,
    durationSec: row.duration_sec,
    featured: row.featured,
    views: row.views,
    likes: row.likes,
    loves: row.loves,
    shares: row.shares,
    youtubeUrl: row.youtube_url,
    html: row.html_content,
  };
}
