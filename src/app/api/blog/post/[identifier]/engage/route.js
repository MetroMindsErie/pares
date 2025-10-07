import { NextResponse } from 'next/server';
import { engageWithPost } from '../../../../../../api/backend/blogHandler';
import { cookies } from 'next/headers';

export async function POST(request, { params }) {
  try {
    const { identifier } = params;
    const body = await request.json();
    
    // Create session or use IP for user tracking
    const cookieStore = cookies();
    let userId = cookieStore.get('blog_session_id')?.value;
    
    if (!userId) {
      // Generate a simple session ID if one doesn't exist
      userId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      cookieStore.set('blog_session_id', userId, { 
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'strict'
      });
    }
    
    // Create a mock request/response object for the handler
    const mockReq = {
      params: { postId: identifier },
      body: body,
      session: { userId },
      ip: userId // Fallback to session ID
    };
    
    let responseData = {};
    const mockRes = {
      json: (data) => {
        responseData = data;
        return mockRes;
      },
      status: (code) => {
        mockRes.statusCode = code;
        return mockRes;
      }
    };
    
    await engageWithPost(mockReq, mockRes);
    
    if (mockRes.statusCode && mockRes.statusCode !== 200) {
      return NextResponse.json(responseData, { status: mockRes.statusCode });
    }
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error in blog post engagement API route:', error);
    return NextResponse.json(
      { error: 'Failed to register engagement' },
      { status: 500 }
    );
  }
}
