import { NextResponse } from 'next/server';
import { supabase } from '../../../../../utils/supabaseClient';

export async function GET(request, { params }) {
  try {
    const { identifier } = params;
    
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
      return NextResponse.json(
        { error: 'Failed to retrieve blog post' },
        { status: error.code === 'PGRST116' ? 404 : 500 }
      );
    }
    
    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }
    
    // Format post for response
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
    
    return NextResponse.json(formattedPost);
  } catch (error) {
    console.error('Error in blog post API route:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve blog post' },
      { status: 500 }
    );
  }
}
