// Script to manually process Facebook reels
// Run with: node scripts/process-reels.js <user_id>

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY
);

export async function processReelsForUser(userId, accessToken = null, fbUserId = null) {
  console.log(`Processing reels for user ${userId}`);
  
  try {
    let facebookToken, facebookUserId;
    
    // Use provided token or get Facebook access token for user
    if (accessToken && fbUserId) {
      facebookToken = accessToken;
      facebookUserId = fbUserId;
      console.log(`Using provided Facebook token for user ${userId}, Facebook ID: ${facebookUserId}`);
    } else {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('facebook_access_token, facebook_user_id')
        .eq('id', userId)
        .single();
        
      if (userError || !userData?.facebook_access_token) {
        console.error('Error getting user data:', userError?.message || 'No Facebook token found');
        return { success: false, error: 'No Facebook token found' };
      }
      
      facebookToken = userData.facebook_access_token;
      facebookUserId = userData.facebook_user_id || 'me';
      console.log(`Found Facebook token for user ${userId}, Facebook ID: ${facebookUserId}`);
    }
    
    // Validate token before proceeding
    if (!facebookToken || facebookToken.trim() === '') {
      console.error('Invalid or empty Facebook token');
      return { success: false, error: 'Invalid Facebook token' };
    }
    
    // Fetch both videos and posts from Facebook
    console.log('Fetching content from Facebook...');
    
    try {
      // Fetch videos first
      console.log('Fetching videos...');
      const apiVideoUrl = `https://graph.facebook.com/v19.0/${facebookUserId}/videos`;
      const videoParams = {
        fields: 'id,title,description,source,picture,created_time,permalink_url,comments.limit(0).summary(true),likes.limit(0).summary(true),tags',
        access_token: facebookToken,
        limit: 50
      };
      
      console.log('Request parameters for videos:', Object.keys(videoParams).join(', '));
      
      const videoResponse = await axios.get(apiVideoUrl, { params: videoParams });
      console.log('Facebook API video response status:', videoResponse.status);
      
      // Also fetch posts which might contain real estate content
      console.log('Fetching posts...');
      const apiPostsUrl = `https://graph.facebook.com/v19.0/${facebookUserId}/posts`;
      const postParams = {
        fields: 'id,message,story,full_picture,permalink_url,created_time,attachments{media,title,description,type},comments.limit(0).summary(true),likes.limit(0).summary(true)',
        access_token: facebookToken,
        limit: 50
      };
      
      console.log('Request parameters for posts:', Object.keys(postParams).join(', '));
      
      const postsResponse = await axios.get(apiPostsUrl, { params: postParams });
      console.log('Facebook API posts response status:', postsResponse.status);
      
      // Combine videos and posts
      const videos = videoResponse?.data?.data || [];
      const posts = postsResponse?.data?.data || [];
      
      console.log(`Found ${videos.length} videos and ${posts.length} posts`);
      
      // Process videos
      const processedVideos = videos.map(video => ({
        id: video.id,
        title: video.title || '',
        description: video.description || '',
        message: '', // Videos don't have messages
        source: video.source,
        media_url: video.source,
        permalink_url: video.permalink_url,
        thumbnail_url: video.picture,
        created_time: video.created_time,
        content_type: 'video',
        hashtags: extractHashtags(video.description || '')
      }));
      
      // Process posts
      const processedPosts = posts.map(post => {
        const mediaUrl = post.attachments?.data?.[0]?.media?.source || 
                         post.attachments?.data?.[0]?.url || 
                         post.full_picture || null;
        const isVideo = post.attachments?.data?.[0]?.type === 'video_inline' || 
                       post.attachments?.data?.[0]?.type === 'video_autoplay';
        
        return {
          id: post.id,
          title: post.attachments?.data?.[0]?.title || '',
          description: post.attachments?.data?.[0]?.description || '',
          message: post.message || post.story || '',
          media_url: mediaUrl,
          permalink_url: post.permalink_url,
          thumbnail_url: post.full_picture,
          created_time: post.created_time,
          content_type: isVideo ? 'video' : 'post',
          hashtags: extractHashtags(post.message || '')
        };
      });
      
      // Combine all content
      const allContent = [...processedVideos, ...processedPosts];
      console.log(`Total combined content items: ${allContent.length}`);
      
      // Print sample content for debugging
      if (allContent.length > 0) {
        const sampleContent = allContent.slice(0, 3);
        console.log('Sample content items:');
        sampleContent.forEach((item, i) => {
          console.log(`Item ${i+1} (${item.content_type}):`);
          console.log(`  ID: ${item.id}`);
          console.log(`  Title: ${item.title || 'No title'}`);
          console.log(`  Message/Description: ${item.message || item.description?.substring(0, 50) || 'No text'}...`);
          console.log(`  Media URL: ${item.media_url ? 'Yes' : 'No'}`);
          console.log(`  Hashtags: ${item.hashtags.join(', ') || 'None'}`);
          console.log('---');
        });
      }
      
      // Keywords to filter real estate relevant content
      const REAL_ESTATE_KEYWORDS = [
        'realestate', 'property', 'home', 'house', 'apartment', 
        'condo', 'realtor', 'listing', 'forsale', 'realty',
        'mortgage', 'investment', 'luxuryhome', 'dreamhome',
        'housing', 'estate', 'sell', 'buy', 'rent', 'sale',
        'homebuying', 'homeselling', 'homesales', 'residential',
        'commercial', 'broker', 'agent', 'selling', 'buying'
      ];
      
      // Filter for real estate content
      console.log('Filtering for real estate related content...');
      
      // If we have fewer than 3 content items total, just keep them all
      let realEstateContent;
      if (allContent.length <= 3) {
        console.log('Few content items found, keeping all without filtering');
        realEstateContent = allContent.map(item => ({ ...item, is_real_estate: true }));
      } else {
        realEstateContent = allContent.filter(item => {
          const text = [
            item.message,
            item.description,
            item.title
          ].filter(Boolean).join(' ').toLowerCase();
          
          // Check hashtags first
          const hasRealEstateHashtag = item.hashtags.some(tag => 
            REAL_ESTATE_KEYWORDS.some(keyword => tag.includes(keyword))
          );
          
          // Then check content text
          const hasRealEstateKeyword = REAL_ESTATE_KEYWORDS.some(keyword => 
            text.includes(keyword)
          );
          
          const isRealEstate = hasRealEstateHashtag || hasRealEstateKeyword;
          
          if (isRealEstate) {
            console.log(`Found real estate content: "${item.title || item.message?.substring(0, 20) || 'Untitled'}"`);
          }
          
          return isRealEstate;
        });
      }
      
      console.log(`Found ${realEstateContent.length} real estate related content items`);
      
      // Store in database
      if (realEstateContent.length > 0) {
        console.log('Storing content in database...');
        
        for (const item of realEstateContent) {
          const { error } = await supabase.from('reels').upsert({
            user_id: userId,
            facebook_reel_id: item.id,
            title: item.title || '',
            caption: item.message || item.description || '',
            media_url: item.media_url || null,
            permalink: item.permalink_url || null,
            thumbnail_url: item.thumbnail_url || null,
            created_at: item.created_time || new Date().toISOString(),
            updated_at: new Date().toISOString(),
            source: 'facebook',
            is_real_estate: true,
            hashtags: item.hashtags
          }, { onConflict: 'user_id,facebook_reel_id' });
          
          if (error) {
            console.error('Error storing content:', error);
          }
        }
        
        console.log('Successfully stored content');
      }
      
      // Return processed content for API usage
      return {
        success: true,
        reels: realEstateContent.map(item => ({
          id: item.id,
          title: item.title || '',
          description: item.description || '',
          message: item.message || '',
          video_url: item.media_url,
          permalink_url: item.permalink_url,
          thumbnail_url: item.thumbnail_url,
          created_at: item.created_time,
          source: 'facebook',
          content_type: item.content_type,
          is_real_estate: true,
          hashtags: item.hashtags
        })),
        count: realEstateContent.length
      };
      
    } catch (apiError) {
      console.error('Facebook Graph API error:', apiError.message);
      if (apiError.response) {
        console.error('API error response code:', apiError.response.status);
        console.error('API error response data:', JSON.stringify(apiError.response.data));
        
        // Check for specific error codes
        if (apiError.response.status === 400 && apiError.response.data?.error?.code === 190) {
          return { 
            success: false, 
            error: 'Facebook token expired or invalid', 
            errorCode: 'token_invalid',
            details: apiError.response.data 
          };
        }
      }
      return { success: false, error: `Facebook Graph API error: ${apiError.message}` };
    }
    
  } catch (error) {
    console.error('Error processing reels:', error);
    return {
      success: false,
      error: error.message || 'Failed to process reels'
    };
  }
}

// Helper function to extract hashtags - improved to handle more cases
export function extractHashtags(text) {
  if (!text) return [];
  const hashtagRegex = /#(\w+)/g;
  const matches = text.match(hashtagRegex);
  
  if (!matches) return [];
  
  // Extract just the hashtag text without the # symbol and convert to lowercase
  const hashtags = matches.map(tag => tag.slice(1).toLowerCase());
  console.log(`Found hashtags: ${hashtags.join(', ')}`);
  
  return hashtags;
}

// If running from command line
if (import.meta.url === `file://${process.argv[1]}`) {
  const userId = process.argv[2];
  
  if (!userId) {
    console.error('Please provide a user ID as an argument');
    process.exit(1);
  }
  
  processReelsForUser(userId)
    .then(result => {
      if (result.success) {
        console.log(`Successfully processed ${result.count} reels for user ${userId}`);
      } else {
        console.error(`Failed to process reels: ${result.error}`);
      }
      process.exit(0);
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}