import { supabase } from '../../../../../utils/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { identifier } = req.query;
    
    const { data: post, error } = await supabase
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
    
    if (error) {
      console.error('Post query error:', error);
      return res.status(error.code === 'PGRST116' ? 404 : 500).json({ error: 'Failed to retrieve blog post' });
    }
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    const formattedPost = {
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
      html: post.html_content,
    };
    
    return res.status(200).json(formattedPost);
  } catch (error) {
    console.error('Error in blog post API route:', error);
    return res.status(500).json({ error: 'Failed to retrieve blog post' });
  }
}
