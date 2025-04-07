// Update the scope parameter in your Facebook OAuth URL
export default async function handler(req, res) {
  try {
    const clientId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/facebook/callback`;
    
    // Make sure both user_videos and user_posts are included in the scope
    const scope = 'email,public_profile,user_videos,user_posts';
    
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code&auth_type=rerequest`;
    
    res.redirect(authUrl);
  } catch (error) {
    console.error('Facebook auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}