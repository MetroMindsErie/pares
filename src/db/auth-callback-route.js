// app/auth/callback/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Exchange the code for a session
    await supabase.auth.exchangeCodeForSession(code);

    // Check if user exists in our custom users table
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      // Check if user already exists in our users table
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      if (!existingUser) {
        // Create new user record
        await supabase.from('users').insert({
          id: session.user.id,
          email: session.user.email,
        });
        
        // Assign default role
        await supabase.from('user_roles').insert({
          user_id: session.user.id,
          role_id: 2, // free_tier role
        });
      }
      
      // Store provider info
      const provider = session.user.app_metadata?.provider;
      const providerUserId = session.user.identities?.[0]?.identity_id;
      
      if (provider && providerUserId) {
        const { data: existingProvider } = await supabase
          .from('auth_providers')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('provider', provider)
          .single();
          
        if (!existingProvider) {
          await supabase.from('auth_providers').insert({
            user_id: session.user.id,
            provider,
            provider_user_id: providerUserId,
            access_token: session.provider_token || null,
            refresh_token: session.provider_refresh_token || null,
            token_expiry: session.expires_at 
              ? new Date(session.expires_at * 1000).toISOString()
              : null,
          });
        }
      }
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL('/dashboard', request.url));
}
