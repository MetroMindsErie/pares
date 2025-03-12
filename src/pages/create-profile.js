import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/auth-context';
import supabase from '../lib/supabase-setup';
import ProfileForm from '../components/Profile/ProfileForm';
import RoleSelector from '../components/Profile/RoleSelector';
import InterestPicker from '../components/Profile/InterestPicker';
import ProfileProgressBar from '../components/Profile/ProfileProgressBar';
import Layout from '../components/Layout';
import { getFacebookToken, getFacebookProfilePicture } from '../services/facebookService';

export default function CreateProfile() {
    const { user, isAuthenticated, loading, authChecked } = useAuth();
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        // Basic info
        first_name: '',
        last_name: '',
        email: '',
        alternate_email: '',
        
        // Contact info
        phone: '',
        city: '',
        state: '',
        zip_code: '',
        
        // Business info
        profile_type_id: 1, // Default to 'Agent'
        title: '',
        years_experience: '',
        
        // Preferences
        notification_email: true,
        notification_sms: false,
        interests: [],
        roles: ['user'], // Default role
        
        // Additional fields
        profile_picture_url: '',
        metadata: {},
        hasprofile: false
    });
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [profilePictureFetched, setProfilePictureFetched] = useState(false);

    // Improved redirect logic
    useEffect(() => {
        // Only redirect if we're certain the user isn't authenticated
        // after the auth check has completed
        if (authChecked && !loading && !isAuthenticated) {
            console.log('No authenticated user found after auth check, redirecting to login');
            router.replace('/login'); // Use replace instead of push to avoid adding to history
        }
    }, [authChecked, loading, isAuthenticated, router]);

    // Debug logging
    useEffect(() => {
        console.log('Auth state:', { 
            isAuthenticated, 
            loading, 
            authChecked,
            hasUser: !!user
        });
    }, [isAuthenticated, loading, authChecked, user]);

    // Prefill email from user account
    useEffect(() => {
        if (user?.email && !formData.email) {
            setFormData(prev => ({...prev, email: user.email}));
        }
    }, [user, formData.email]);

    // Try to get profile picture from Facebook if available
    useEffect(() => {
        const fetchProfilePicture = async () => {
            if (!user || !user.id || profilePictureFetched) return;
            
            try {
                console.log('Checking for user profile picture');
                
                // First check if user already has a picture in the database
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('profile_picture_url')
                    .eq('id', user.id)
                    .single();
                
                if (!userError && userData?.profile_picture_url) {
                    console.log('User already has profile picture in database:', userData.profile_picture_url);
                    setFormData(prev => ({
                        ...prev,
                        profile_picture_url: userData.profile_picture_url
                    }));
                    setProfilePictureFetched(true);
                    return;
                }
                
                // If the user signed up with Facebook, get their profile picture
                if (user.app_metadata?.provider === 'facebook') {
                    console.log('User authenticated with Facebook, fetching picture');
                    
                    // Try to get picture from user metadata first (fastest)
                    if (user.user_metadata?.avatar_url) {
                        console.log('Found avatar in user metadata:', user.user_metadata.avatar_url);
                        setFormData(prev => ({
                            ...prev,
                            profile_picture_url: user.user_metadata.avatar_url
                        }));
                        
                        // Also immediately save to users table
                        await supabase
                            .from('users')
                            .update({ 
                                profile_picture_url: user.user_metadata.avatar_url,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', user.id);
                            
                        console.log('Saved profile picture from metadata to database');
                        setProfilePictureFetched(true);
                        return;
                    }
                    
                    // Otherwise try to get from Facebook API
                    const tokenData = await getFacebookToken(user.id);
                    
                    if (tokenData?.accessToken) {
                        console.log('Found Facebook token, fetching picture directly');
                        // Pass user ID to ensure it's saved to database
                        const pictureUrl = await getFacebookProfilePicture(
                            tokenData.accessToken, 
                            tokenData.providerId,
                            user.id
                        );
                        
                        if (pictureUrl) {
                            console.log('Got Facebook picture URL:', pictureUrl);
                            setFormData(prev => ({
                                ...prev,
                                profile_picture_url: pictureUrl
                            }));
                        }
                    } else {
                        console.log('No Facebook token available, trying session');
                        
                        // Try to get from current session if token not found
                        const { data: { session } } = await supabase.auth.getSession();
                        if (session?.provider_token) {
                            console.log('Found token in session, trying to fetch picture');
                            
                            // Try direct Facebook Graph API request
                            try {
                                const response = await fetch('https://graph.facebook.com/me?fields=picture.type(large)&access_token=' + session.provider_token);
                                const data = await response.json();
                                
                                if (data?.picture?.data?.url) {
                                    const pictureUrl = data.picture.data.url;
                                    console.log('Got picture URL from session token:', pictureUrl);
                                    
                                    setFormData(prev => ({
                                        ...prev,
                                        profile_picture_url: pictureUrl
                                    }));
                                    
                                    // Save to database
                                    await supabase
                                        .from('users')
                                        .update({ 
                                            profile_picture_url: pictureUrl,
                                            updated_at: new Date().toISOString()
                                        })
                                        .eq('id', user.id);
                                        
                                    console.log('Saved profile picture from session to database');
                                }
                            } catch (fbError) {
                                console.error('Error fetching picture from session token:', fbError);
                            }
                        }
                    }
                }
                
                setProfilePictureFetched(true);
            } catch (error) {
                console.error('Error fetching profile picture:', error);
                setProfilePictureFetched(true);
            }
        };
        
        fetchProfilePicture();
    }, [user, profilePictureFetched]);

    const handleProfileFormSubmit = (data) => {
        setFormData(prev => ({
            ...prev,
            first_name: data.firstName,
            last_name: data.lastName,
            email: data.email || prev.email,
            alternate_email: data.alternateEmail,
            city: data.city,
            state: data.state,
            zip_code: data.zipCode,
            phone: data.phone,
            profile_type_id: data.profileTypeId || prev.profile_type_id
        }));
        
        setCurrentStep(prevStep => prevStep + 1);
    };

    const handleRoleChange = (selectedRoles) => {
        setFormData(prev => ({
            ...prev,
            roles: selectedRoles
        }));
    };

    const handleInterestChange = (selectedInterests) => {
        setFormData(prev => ({
            ...prev,
            interests: selectedInterests
        }));
    };

    const handleStepClick = (stepNumber) => {
        // Allow navigating to steps the user has already completed
        if (stepNumber <= currentStep) {
            setCurrentStep(stepNumber);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setError(null);

        try {
            // Log the current user state for debugging
            console.log('Current user state during submission:', { 
                hasUser: !!user, 
                userId: user?.id,
                isAuthenticated
            });

            // Check if user exists in context
            if (!user) {
                console.log('User missing in context, attempting to refresh session');
                // Try to refresh the session
                const { data: sessionData } = await supabase.auth.getSession();
                
                if (sessionData?.session?.user) {
                    console.log('Retrieved user from session refresh:', sessionData.session.user.id);
                    // Use the refreshed user
                    const userId = sessionData.session.user.id;
                    
                    // Prepare metadata with additional fields
                    const metadata = {
                        ...formData.metadata,
                        notification_preferences: {
                            email: formData.notification_email,
                            sms: formData.notification_sms
                        },
                        years_experience: formData.years_experience,
                        title: formData.title
                    };

                    // Save to database
                    const dataToSubmit = {
                        first_name: formData.first_name,
                        last_name: formData.last_name,
                        email: formData.email,
                        alternate_email: formData.alternate_email,
                        phone: formData.phone,
                        city: formData.city,
                        state: formData.state,
                        zip_code: formData.zip_code,
                        profile_type_id: formData.profile_type_id,
                        interests: formData.interests,
                        roles: formData.roles,
                        profile_picture_url: formData.profile_picture_url,
                        metadata: metadata,
                        hasprofile: true,
                        updated_at: new Date().toISOString()
                    };

                    console.log('Saving profile with refreshed user ID:', userId);
                    const { error: updateError } = await supabase
                        .from('users')
                        .update(dataToSubmit)
                        .eq('id', userId);

                    if (updateError) throw updateError;

                    // Redirect to dashboard after successful profile setup
                    router.push('/dashboard');
                    return;
                } else {
                    throw new Error('Could not retrieve user session');
                }
            }

            // If we have a user in context, proceed normally
            const metadata = {
                ...formData.metadata,
                notification_preferences: {
                    email: formData.notification_email,
                    sms: formData.notification_sms
                },
                years_experience: formData.years_experience,
                title: formData.title
            };

            // Save to database
            const dataToSubmit = {
                first_name: formData.first_name,
                last_name: formData.last_name,
                email: formData.email,
                alternate_email: formData.alternate_email,
                phone: formData.phone,
                city: formData.city,
                state: formData.state,
                zip_code: formData.zip_code,
                profile_type_id: formData.profile_type_id,
                interests: formData.interests,
                roles: formData.roles,
                profile_picture_url: formData.profile_picture_url,
                metadata: metadata,
                hasprofile: true,
                updated_at: new Date().toISOString()
            };

            // Ensure profile picture is included if we have it
            if (formData.profile_picture_url) {
                console.log('Including profile picture URL in profile submission:', formData.profile_picture_url);
                dataToSubmit.profile_picture_url = formData.profile_picture_url;
            } else {
                // Last attempt to get profile picture
                try {
                    console.log('Making final attempt to get profile picture');
                    if (user?.app_metadata?.provider === 'facebook') {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (session?.provider_token) {
                            const response = await fetch('https://graph.facebook.com/me?fields=picture.type(large)&access_token=' + session.provider_token);
                            const data = await response.json();
                            
                            if (data?.picture?.data?.url) {
                                dataToSubmit.profile_picture_url = data.picture.data.url;
                                console.log('Found profile picture in final attempt:', dataToSubmit.profile_picture_url);
                            }
                        }
                    }
                } catch (picError) {
                    console.error('Final profile picture attempt failed:', picError);
                }
            }

            // If this was a Facebook login, ensure provider data is saved
            if (user?.app_metadata?.provider === 'facebook') {
                const { data: providerData } = await supabase
                    .from('auth_providers')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('provider', 'facebook')
                    .single();
                
                if (!providerData) {
                    console.log('No Facebook provider data found, saving from session');
                    const { data: { session } } = await supabase.auth.getSession();
                    
                    if (session?.provider_token) {
                        // Get identity data
                        const identity = user.identities?.find(i => i.provider === 'facebook');
                        
                        if (identity) {
                            console.log('Saving Facebook provider data');
                            await supabase.from('auth_providers').insert({
                                user_id: user.id,
                                provider: 'facebook',
                                provider_user_id: identity.id,
                                access_token: session.provider_token,
                                refresh_token: session.provider_refresh_token || null,
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            });
                            
                            // Also update users table with Facebook token
                            dataToSubmit.facebook_access_token = session.provider_token;
                            dataToSubmit.facebook_user_id = identity.id;
                            dataToSubmit.facebook_token_valid = true;
                            dataToSubmit.facebook_token_updated_at = new Date().toISOString();
                        }
                    }
                }
            }
            
            // Explicitly add profile picture URL if it exists
            if (formData.profile_picture_url) {
                console.log('Including profile picture in submission:', formData.profile_picture_url);
                dataToSubmit.profile_picture_url = formData.profile_picture_url;
            }

            console.log('Saving profile with user ID from context:', user.id);
            const { error } = await supabase
                .from('users')
                .update(dataToSubmit)
                .eq('id', user.id);

            if (error) throw error;

            console.log('Completed profile creation, redirecting to dashboard');
            
            // After successful save, force session refresh before redirecting
            // This prevents the login redirect loop
            await supabase.auth.refreshSession();
            
            // Add a slight delay to ensure state updates propagate
            setTimeout(() => {
                router.push('/dashboard');
            }, 500);
        } catch (error) {
            console.error('Error creating profile:', error);
            setError('Failed to create profile: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex justify-center items-center">
                <div className="animate-spin h-10 w-10 border-4 border-blue-500 rounded-full border-t-transparent"></div>
            </div>
        );
    }

    const renderCurrentStepContent = () => {
        switch (currentStep) {
            case 1:
            case 2:
            case 3:
                return (
                    <ProfileForm 
                        onSubmit={handleProfileFormSubmit}
                        initialData={formData}
                        onBack={() => setCurrentStep(prev => Math.max(prev - 1, 1))}
                        step={currentStep}
                    />
                );
            case 4:
                return (
                    <RoleSelector 
                        selectedRoles={formData.roles}
                        onChange={handleRoleChange}
                        onNext={() => setCurrentStep(5)}
                        onBack={() => setCurrentStep(3)}
                    />
                );
            case 5:
                return (
                    <InterestPicker 
                        selectedInterests={formData.interests}
                        onChange={handleInterestChange}
                        onBack={() => setCurrentStep(4)}
                        onSubmit={handleSubmit}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <Layout>
            <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto">
                    <div className="space-y-8">
                        <div className="text-center">
                            <h1 className="text-2xl font-bold text-gray-900">Complete Your Profile</h1>
                            <p className="mt-2 text-sm text-gray-500">
                                Please provide your information to get started.
                            </p>
                        </div>

                        {error && (
                            <div className="rounded-md bg-red-50 p-4">
                                <div className="flex">
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-red-800">Error</h3>
                                        <div className="mt-2 text-sm text-red-700">
                                            <p>{error}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="bg-white overflow-hidden shadow rounded-lg">
                            <div className="px-4 py-5 sm:p-6">
                                {/* Profile Setup Progress */}
                                <ProfileProgressBar 
                                    steps={5} 
                                    currentStep={currentStep}
                                    onStepClick={handleStepClick}
                                />
                                
                                {/* Current Step Content */}
                                <div className="mt-6">
                                    {renderCurrentStepContent()}
                                </div>
                                
                                {/* Loading State */}
                                {isSubmitting && (
                                    <div className="absolute inset-0 bg-white/75 flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
