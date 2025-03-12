// ...existing code...

async function registerWithFacebook() {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'facebook',
            options: {
                scopes: 'email,public_profile,user_videos',
                redirectTo: `${window.location.origin}/auth/callback`
            }
        });

        if (error) throw error;
    } catch (error) {
        console.error('Error with Facebook auth:', error.message);
    }
}

export async function handleAuthCallback() {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
        console.error('Session error:', error);
        window.location.href = '/login';
        return;
    }
    
    if (session) {
        const { user, provider_token, provider_refresh_token, expires_at } = session;

        try {
            // Extract Facebook profile data from user metadata
            const avatarUrl = user.user_metadata?.avatar_url;
            const firstName = user.user_metadata?.full_name?.split(' ')[0] || '';
            const lastName = user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '';
            
            console.log('Auth callback with user metadata:', user.user_metadata);
            
            // Create or update user record with Facebook profile data
            const { error: userError } = await supabase
                .from('users')
                .upsert({ 
                    id: user.id,
                    email: user.email,
                    hasprofile: false,
                    first_name: firstName,
                    last_name: lastName,
                    profile_picture_url: avatarUrl,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id' });

            if (userError) throw userError;

            // Save auth provider details with correct field names
            const { error: providerError } = await supabase
                .from('auth_providers')
                .upsert({
                    user_id: user.id,
                    provider: 'facebook',
                    provider_user_id: user.identities?.[0]?.id,
                    access_token: provider_token,
                    refresh_token: provider_refresh_token,
                    token_expiry: new Date(expires_at * 1000),
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id, provider' });

            if (providerError) throw providerError;

            const { data: profile } = await supabase
                .from('users')
                .select('hasprofile')
                .eq('id', user.id)
                .single();

            if (profile?.hasprofile) {
                window.location.replace('/dashboard');
            } else {
                window.location.replace('/create-profile');
            }
        } catch (error) {
            console.error('Error in auth callback:', error);
            window.location.href = '/login';
        }
    }
}

// ...existing code...
