/**
 * API functions for blog post management
 */

// Function to fetch posts with optional filtering
export async function fetchPosts({ 
  tab = 'All', 
  category = 'All', 
  query = '', 
  page = 1, 
  pageSize = 6 
}) {
  try {
    const params = new URLSearchParams({
      tab,
      category,
      q: query,
      page,
      pageSize
    });
    
    const response = await fetch(`/api/blog/posts?${params.toString()}`);
    if (!response.ok) {
      throw new Error('Failed to fetch blog posts');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    throw error;
  }
}

// Function to fetch a single post by ID or slug
export async function fetchPost(identifier) {
  try {
    const response = await fetch(`/api/blog/post/${identifier}`);
    if (!response.ok) {
      throw new Error('Failed to fetch blog post');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching blog post:', error);
    throw error;
  }
}

// Function to fetch related posts
export async function fetchRelatedPosts(postId, limit = 3) {
  try {
    const params = new URLSearchParams({ limit });
    const response = await fetch(`/api/blog/post/${postId}/related?${params.toString()}`);
    if (!response.ok) {
      throw new Error('Failed to fetch related posts');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching related posts:', error);
    throw error;
  }
}

// Function to register engagement (like, love, share)
export async function engageWithPost(postId, engagementType) {
  try {
    const response = await fetch(`/api/blog/post/${postId}/engage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ engagementType })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to register ${engagementType}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error registering ${engagementType}:`, error);
    throw error;
  }
}

// Function to fetch all categories
export async function fetchCategories() {
  try {
    const response = await fetch('/api/blog/categories');
    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching categories:', error);
    return { categories: [] }; // Return empty array on error to prevent UI crashes
  }
}
