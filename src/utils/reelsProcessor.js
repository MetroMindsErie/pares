import { createClient } from '@supabase/supabase-js';
import { processUserReels } from '../services/facebookServices';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Process reels for all users with valid Facebook tokens
 * This can be run as a scheduled job (e.g., with cron or a serverless function)
 */
export async function processAllUserReels() {
  try {
    // Get all users with Facebook tokens
    const { data: users, error } = await supabase
      .from('users')
      .select('id, facebook_access_token')
      .not('facebook_access_token', 'is', null);

    if (error) throw error;

    console.log(`Starting reels processing for ${users.length} users`);
    
    // Process reels for each user
    const results = await Promise.allSettled(
      users.map(user => 
        processUserReels(user.id, user.facebook_access_token)
          .catch(err => {
            // Log the error but don't stop processing for other users
            console.error(`Error processing reels for user ${user.id}:`, err);
            
            // If token is invalid, mark it for cleanup
            if (err.message?.includes('token') || err.response?.status === 401) {
              return markInvalidToken(user.id);
            }
          })
      )
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    console.log(`Completed reels processing: ${successful}/${users.length} successful`);
    
    return { total: users.length, successful };
  } catch (error) {
    console.error('Error in batch reels processing:', error);
    throw error;
  }
}

/**
 * Mark a user's Facebook token as invalid
 */
async function markInvalidToken(userId) {
  try {
    await supabase
      .from('users')
      .update({ 
        facebook_token_valid: false,
        facebook_token_invalid_at: new Date().toISOString()
      })
      .eq('id', userId);
  } catch (err) {
    console.error(`Error marking token invalid for user ${userId}:`, err);
  }
}
