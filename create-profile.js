// ...existing code...

async function createProfile(profileData) {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
            console.error('No active session found');
            window.location.replace('/login');
            return;
        }

        const { error: profileError } = await supabase
            .from('users')
            .update({ 
                ...profileData,
                hasprofile: true,
                updated_at: new Date()
            })
            .eq('id', session.user.id);

        if (profileError) throw profileError;

        // Fetch auth provider token with correct field name
        const { data: authProvider } = await supabase
            .from('auth_providers')
            .select('access_token')
            .eq('user_id', session.user.id)
            .eq('provider', 'facebook')
            .single();

        if (authProvider?.access_token) {
            await loadFacebookReels(session.user.id, authProvider.access_token);
        }

        window.location.replace('/dashboard');
    } catch (error) {
        console.error('Error creating profile:', error);
    }
}

// Helper function to load Facebook reels
async function loadFacebookReels(userId, fbToken) {
    // Implement Facebook reels loading logic here
    // ...existing code...
}

// ...existing code...
