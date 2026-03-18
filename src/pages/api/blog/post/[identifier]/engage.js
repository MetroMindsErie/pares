import { engageWithPost } from '../../../../../api/backend/blogHandler';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { identifier } = req.query;
    const body = req.body;
    
    // Use a cookie-based session ID for tracking engagement
    let userId = req.cookies?.blog_session_id;
    
    if (!userId) {
      userId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      res.setHeader('Set-Cookie', `blog_session_id=${userId}; Path=/; Max-Age=${60 * 60 * 24 * 30}; HttpOnly; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
    }
    
    // Create a mock request/response for the handler
    const mockReq = {
      params: { postId: identifier },
      body: body,
      session: { userId },
      ip: userId
    };
    
    let responseData = {};
    let statusCode = 200;
    const mockRes = {
      json: (data) => {
        responseData = data;
        return mockRes;
      },
      status: (code) => {
        statusCode = code;
        return mockRes;
      }
    };
    
    await engageWithPost(mockReq, mockRes);
    
    return res.status(statusCode).json(responseData);
  } catch (error) {
    console.error('Error in blog post engagement API route:', error);
    return res.status(500).json({ error: 'Failed to register engagement' });
  }
}
