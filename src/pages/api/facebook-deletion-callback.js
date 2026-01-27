import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialize Supabase admin client for data deletion
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const FACEBOOK_APP_SECRET = process.env.SUPABASE_AUTH_FACEBOOK_SECRET;

export default async function handler(req, res) {
  // Handle Facebook webhook verification during setup
  if (req.method === 'GET') {
    // Facebook sends a challenge to verify the webhook
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Verify using your configured verification token
    const verifyToken = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN;



    if (mode === 'subscribe' && token === verifyToken) {

      return res.status(200).send(challenge);
    } else {
      return res.status(403).json({ error: 'Verification failed' });
    }
  }

  // For other methods, redirect to the data deletion instructions page
  const host = process.env.NEXT_PUBLIC_APP_URL || req.headers.host;
  const deletionInstructionsUrl = `${host}/data-deletion-instructions`;
  
  return res.redirect(302, deletionInstructionsUrl);
}
