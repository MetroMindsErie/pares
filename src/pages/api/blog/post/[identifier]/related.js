import { supabase } from '../../../../../utils/supabaseClient';
import { edgeHandler } from '../../../../../lib/edgeHandler';


export default edgeHandler(async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { identifier } = req.query;
    const limit = parseInt(req.query.limit || '3');
    
    // First get the current post
    const { data: post, error: postError } = await supabase
      .from('blog_posts')
      .select('id')
      .or(`post_id.eq.${identifier},slug.eq.${identifier}`)
      .single();
    
    if (postError || !post) {
      console.error('Error fetching post:', postError);
      return res.status(200).json({ posts: [] });
    }
    
    // Get category IDs for this post
    const { data: categories } = await supabase
      .from('post_categories')
      .select('category_id')
      .eq('post_id', post.id);
    
    const categoryIds = (categories || []).map(c => c.category_id).filter(Boolean);
    
    // Get tag IDs for this post
    const { data: tags } = await supabase
      .from('post_tags')
      .select('tag_id')
      .eq('post_id', post.id);
    
    const tagIds = (tags || []).map(t => t.tag_id).filter(Boolean);
    
    if (categoryIds.length === 0 && tagIds.length === 0) {
      return res.status(200).json({ posts: [] });
    }
    
    let filterCondition = '';
    
    if (categoryIds.length > 0) {
      const catFilter = categoryIds.map(id => `post_categories.category_id.eq.${id}`).join(',');
      filterCondition += catFilter;
    }
    
    if (tagIds.length > 0) {
      if (filterCondition) filterCondition += ',';
      const tagFilter = tagIds.map(id => `post_tags.tag_id.eq.${id}`).join(',');
      filterCondition += tagFilter;
    }
    
    const { data: relatedPosts, error: relatedError } = await supabase
      .from('blog_posts')
      .select(`
        kind, post_id, slug, title, excerpt, 
        cover_url, cover_alt, cover_aspect_ratio,
        authors:author_id(name), 
        date_published, neighborhood, price_range,
        duration_sec, featured, views, likes, loves, shares,
        youtube_url,
        categories:post_categories(categories(name)),
        tags:post_tags(tags(name))
      `)
      .neq('id', post.id)
      .or(filterCondition)
      .order('date_published', { ascending: false })
      .limit(limit);
    
    if (relatedError) {
      console.error('Error fetching related posts:', relatedError);
      return res.status(200).json({ posts: [] });
    }
    
    const formattedPosts = (relatedPosts || []).map(post => ({
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
      categories: post.categories.map(c => c.categories.name),
      tags: post.tags.map(t => t.tags.name),
      author: { name: post.authors?.name || 'Unknown' },
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
    }));
    
    return res.status(200).json({ posts: formattedPosts });
  } catch (error) {
    console.error('Error in related posts API route:', error);
    return res.status(500).json({ error: 'Failed to retrieve related posts' });
  }
}

);

export const runtime = 'edge';
