import { NextResponse } from 'next/server';
import { supabase } from '../../../../utils/supabaseClient';

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const tab = url.searchParams.get('tab') || 'All';
    const category = url.searchParams.get('category') || 'All';
    const q = url.searchParams.get('q') || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '6');
    const offset = (page - 1) * pageSize;
    
    // Build base query conditions
    let conditions = {};
    
    // Apply filters
    if (tab === 'Videos') {
      conditions.kind = 'video';
    } else if (tab === 'Stories') {
      conditions.kind = 'article';
    }
    
    // First get the total count (have to use a separate query for this)
    const { count, error: countError } = await supabase
      .from('blog_posts')
      .select('*', { count: 'exact', head: true })
      .match(conditions);
    
    if (countError) {
      console.error('Count error:', countError);
      return NextResponse.json(
        { error: 'Failed to count blog posts' },
        { status: 500 }
      );
    }
    
    // Then fetch the actual data with pagination
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
      return NextResponse.json(
        { error: 'Failed to retrieve blog posts' },
        { status: 500 }
      );
    }
    
    // Get additional data for each post in parallel
    const postIds = posts.map(post => post.id);
    
    // Get authors
    const { data: authors } = await supabase
      .from('authors')
      .select('id, name')
      .in('id', posts.map(p => p.author_id).filter(Boolean));
    
    const authorMap = (authors || []).reduce((map, author) => {
      map[author.id] = author;
      return map;
    }, {});
    
    // Get categories for all posts
    const { data: categories } = await supabase
      .from('post_categories')
      .select('post_id, categories(name)')
      .in('post_id', postIds);
    
    const categoryMap = {};
    (categories || []).forEach(item => {
      if (!categoryMap[item.post_id]) categoryMap[item.post_id] = [];
      if (item.categories) categoryMap[item.post_id].push(item.categories.name);
    });
    
    // Get tags for all posts
    const { data: tags } = await supabase
      .from('post_tags')
      .select('post_id, tags(name)')
      .in('post_id', postIds);
    
    const tagMap = {};
    (tags || []).forEach(item => {
      if (!tagMap[item.post_id]) tagMap[item.post_id] = [];
      if (item.tags) tagMap[item.post_id].push(item.tags.name);
    });
    
    // Format posts for response
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
    
    return NextResponse.json({
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
    return NextResponse.json(
      { error: 'Failed to retrieve blog posts' },
      { status: 500 }
    );
  }
}