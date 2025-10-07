import { NextResponse } from 'next/server';
import { supabase } from '../../../../../../utils/supabaseClient';

export async function GET(request, { params }) {
  try {
    const { identifier } = params;
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '3');
    
    // First get the current post
    const { data: post, error: postError } = await supabase
      .from('blog_posts')
      .select('id')
      .or(`post_id.eq.${identifier},slug.eq.${identifier}`)
      .single();
    
    if (postError || !post) {
      console.error('Error fetching post:', postError);
      return NextResponse.json({ posts: [] });
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
    
    // If no categories or tags, return empty array
    if (categoryIds.length === 0 && tagIds.length === 0) {
      return NextResponse.json({ posts: [] });
    }
    
    // Build filter conditions
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
    
    // Get related posts that share categories or tags
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
      return NextResponse.json({ posts: [] });
    }
    
    // Format the related posts
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
    
    return NextResponse.json({ posts: formattedPosts });
  } catch (error) {
    console.error('Error in related posts API route:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve related posts', posts: [] },
      { status: 500 }
    );
  }
}