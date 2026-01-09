// Update the scope parameter in your Facebook OAuth URL
export default async function handler(req, res) {
  try {
    const clientId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    if (!clientId) {
      return res.status(500).json({ error: 'Facebook App ID not configured' });
    }

    const forwardedProto = (req.headers['x-forwarded-proto'] || '').toString().split(',')[0].trim();
    const forwardedHost = (req.headers['x-forwarded-host'] || '').toString().split(',')[0].trim();
    const host = forwardedHost || (req.headers.host || '').toString();
    const proto = forwardedProto || 'http';
    const requestOrigin = host ? `${proto}://${host}` : '';
    const baseUrl = requestOrigin || process.env.NEXT_PUBLIC_BASE_URL || '';
    const redirectUri = `${baseUrl}/api/auth/facebook/callback`;
    
    // Make sure both user_videos and user_posts are included in the scope
    const scope = 'email,public_profile,user_videos,user_posts';
    
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code&auth_type=rerequest`;
    
    res.redirect(authUrl);
  } catch (error) {
    console.error('Facebook auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}