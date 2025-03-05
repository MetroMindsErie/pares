// Script to manually process Facebook reels
// Run with: node scripts/process-reels.js <user_id>

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function processReelsForUser(userId) {
  console.log(`Processing reels for user ${userId}`);
  
  try {
    // Get Facebook access token for user
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('facebook_access_token, facebook_user_id')
      .eq('id', userId)
      .single();
      
    if (userError || !userData?.facebook_access_token) {
      console.error('Error getting user data:', userError?.message || 'No Facebook token found');
      return false;
    }
    
    console.log(`Found Facebook token for user ${userId}, Facebook ID: ${userData.facebook_user_id}`);
    
    // Fetch reels from Facebook
    console.log('Fetching reels from Facebook...');
    
    // Importing axios for HTTP requests
    const axios = require('axios');
    
    // Using Facebook Graph API to get videos/reels
    const response = await axios.get('https://graph.facebook.com/v18.0/me/videos', {
      params: {
        fields: 'id,title,description,source,picture,created_time,permalink_url,comments.limit(0).summary(true),likes.limit(0).summary(true),tags',
        access_token: userData.facebook_access_token,
        limit: 50
      }
    });
    
    const reels = response.data.data || [];
    console.log(`Found ${reels.length} raw reels/videos`);
    
    // Print out some information about the reels
    if (reels.length > 0) {
      reels.slice(0, 3).forEach((reel, i) => {
        console.log(`Reel ${i+1}:`);
        console.log(`  ID: ${reel.id}`);
        console.log(`  Title: ${reel.title || 'No title'}`);
        console.log(`  Description: ${reel.description?.substring(0, 50) || 'No description'}...`);
        console.log(`  Has source: ${!!reel.source}`);
        console.log(`  Tags: ${reel.tags ? reel.tags.length : 0}`);
        console.log('---');
      });
    }
    
    // Filter for real estate content
    console.log('Filtering for real estate related content...');
    
    // Keywords to filter real estate relevant content
    const REAL_ESTATE_KEYWORDS = [
      'realestate', 'property', 'home', 'house', 'apartment', 
      'condo', 'realtor', 'listing', 'forsale', 'realty',
      'mortgage', 'investment', 'luxuryhome', 'dreamhome',
      'housing', 'estate', 'sell', 'buy', 'rent', 'sale',
      'homebuying', 'homeselling', 'homesales', 'residential',
      'commercial', 'broker', 'agent', 'selling', 'buying'
    ];
    
    // If we have fewer than 3 reels total, just keep them all
    let realEstateReels;
    if (reels.length <= 3) {
      console.log('Few reels found, keeping all without filtering');
      realEstateReels = reels.map(reel => ({ ...reel, is_real_estate: true }));
    } else {
      realEstateReels = reels.filter(reel => {
        const description = (reel.description || '').toLowerCase();
        const title = (reel.title || '').toLowerCase();
        const tags = reel.tags ? reel.tags.map(tag => tag.name.toLowerCase()) : [];
        
        // Check if any real estate keyword exists in description, title or tags
        const isRealEstate = REAL_ESTATE_KEYWORDS.some(keyword => 
          description.includes(keyword) || 
          title.includes(keyword) ||
          tags.some(tag => tag.includes(keyword))
        );
        
        if (isRealEstate) {
          console.log(`Found real estate content: "${reel.title || reel.description?.substring(0, 20) || 'Untitled'}"`);
        }
        
        return isRealEstate;
      });
    }
    
    console.log(`Found ${realEstateReels.length} real estate related reels/videos`);
    
    // Store in database
    if (realEstateRe