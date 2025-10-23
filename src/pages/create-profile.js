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
import { saveUserProfile } from '../utils/profileUtils';

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

            router.replace('/login'); // Use replace instead of push to avoid adding to history
        }
    }, [authChecked, loading, isAuthenticated, router]);

    // Debug logging
    useEffect(() => {
        ('Auth state:', { 
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

                
                // First check if user already has a picture in the database
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('profile_picture_url')
                    .eq('id', user.id)
                    .single();
                
                if (!userError && userData?.profile_picture_url) {

                    setFormData(prev => ({
                        ...prev,
                        profile_picture_url: userData.profile_picture_url
                    }));
                    setProfilePictureFetched(true);
                    return;
                }
                
                // If the user signed up with Facebook, get their profile picture
                if (user.app_metadata?.provider === 'facebook') {

                    
                    // Try to get picture from user metadata first (fastest)
                    if (user.user_metadata?.avatar_url) {

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
                            

                        setProfilePictureFetched(true);
                        return;
                    }
                    
                    // Otherwise try to get from Facebook API
                    const tokenData = await getFacebookToken(user.id);
                    
                    if (tokenData?.accessToken) {

                        // Pass user ID to ensure it's saved to database
                        const pictureUrl = await getFacebookProfilePicture(
                            tokenData.accessToken, 
                            tokenData.providerId,
                            user.id
                        );
                        
                        if (pictureUrl) {

                            setFormData(prev => ({
                                ...prev,
                                profile_picture_url: pictureUrl
                            }));
                        }
                    } else {

                        
                        // Try to get from current session if token not found
                        const { data: { session } } = await supabase.auth.getSession();
                        if (session?.provider_token) {

                            
                            // Try direct Facebook Graph API request
                            try {
                                const response = await fetch('https://graph.facebook.com/me?fields=picture.type(large)&access_token=' + session.provider_token);
                                const data = await response.json();
                                
                                if (data?.picture?.data?.url) {
                                    const pictureUrl = data.picture.data.url;

                                    
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

    // Preserve role selection state between steps by storing in session storage
    const handleRoleChange = (selectedRoles) => {
        // Save to session storage immediately to preserve state
        sessionStorage.setItem('selectedRoles', JSON.stringify(selectedRoles));
        
        // Directly update state with new array to avoid accidental mutation
        setFormData(prev => ({
            ...prev,
            roles: [...selectedRoles] // Copy array to ensure it's a new reference
        }));
    };

    // When switching steps, make sure to preserve roles
    useEffect(() => {
        // When going to the interest step (step 5), ensure roles are preserved
        if (currentStep === 5) {
            const savedRoles = sessionStorage.getItem('selectedRoles');
            if (savedRoles) {
                try {
                    const parsedRoles = JSON.parse(savedRoles);
                    if (Array.isArray(parsedRoles) && parsedRoles.length > 0) {
                        // Ensure we don't lose roles when going to the last step

                        setFormData(prev => ({
                            ...prev,
                            roles: parsedRoles
                        }));
                    }
                } catch (e) {
                    console.error('Error parsing saved roles:', e);
                }
            }
        }
    }, [currentStep]);

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

        // Clear session storage flag to prevent infinite loops
        sessionStorage.removeItem('expectedRoles');
        
        try {
            // Log the current user state for debugging
            ('Current user state during submission:', { 
                hasUser: !!user, 
                userId: user?.id,
                isAuthenticated,
                formData: {
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                    email: formData.email,
                    // Log only key fields to avoid cluttering the console
                    roles: formData.roles
                }
            });

            // Check if user exists in context
            if (!user) {

                // Try to refresh the session
                const { data: sessionData } = await supabase.auth.getSession();
                
                if (sessionData?.session?.user) {

                    // Use the refreshed user
                    const userId = sessionData.session.user.id;
                    
                    // Fetch existing user data from the database to preserve Facebook info
                    const { data: existingUserData, error: userDataError } = await supabase
                        .from('users')
                        .select('facebook_access_token, facebook_user_id, facebook_token_valid, facebook_token_updated_at, profile_picture_url')
                        .eq('id', userId)
                        .single();
                        
                    if (userDataError) {
                        console.warn('Could not fetch existing user data:', userDataError);
                    }
                    
                    // Preserve any Facebook data that might exist
                    const facebookData = existingUserData ? {
                        facebook_access_token: existingUserData.facebook_access_token,
                        facebook_user_id: existingUserData.facebook_user_id,
                        facebook_token_valid: existingUserData.facebook_token_valid,
                        facebook_token_updated_at: existingUserData.facebook_token_updated_at
                    } : {};
                    
                    // Use profile picture from existing data if not set in form
                    if (existingUserData?.profile_picture_url && !formData.profile_picture_url) {
                        formData.profile_picture_url = existingUserData.profile_picture_url;
                    }
                    
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

                    // Prepare data for submission
                    const dataToSubmit = {
                        first_name: formData.first_name,
                        last_name: formData.last_name,
                        email: formData.email || sessionData.session.user.email, // Ensure email is set
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
                        updated_at: new Date().toISOString(),
                        // Preserve any existing Facebook data
                        ...facebookData
                    };

                    // Verify all required fields are present
                    if (!dataToSubmit.first_name || !dataToSubmit.last_name) {
                        throw new Error('First name and last name are required');
                    }


                    
                    // Use our new utility function for more reliable saving
                    const saveSuccess = await saveUserProfile(userId, dataToSubmit);
                    
                    if (!saveSuccess) {
                        throw new Error('Failed to save profile after multiple attempts');
                    }


                    router.push('/dashboard');
                    return;
                } else {
                    throw new Error('Could not retrieve user session');
                }
            }

            // If we have a user in context, proceed with similar logic
            // Fetch existing user data to preserve Facebook info
            const { data: existingUserData, error: userDataError } = await supabase
                .from('users')
                .select('facebook_access_token, facebook_user_id, facebook_token_valid, facebook_token_updated_at, profile_picture_url')
                .eq('id', user.id)
                .single();
                
            if (userDataError) {
                console.warn('Could not fetch existing user data:', userDataError);
            }
            
            // Preserve any Facebook data that might exist
            const facebookData = existingUserData ? {
                facebook_access_token: existingUserData.facebook_access_token,
                facebook_user_id: existingUserData.facebook_user_id,
                facebook_token_valid: existingUserData.facebook_token_valid,
                facebook_token_updated_at: existingUserData.facebook_token_updated_at
            } : {};
            
            // Use profile picture from existing data if not set in form
            if (existingUserData?.profile_picture_url && !formData.profile_picture_url) {
                formData.profile_picture_url = existingUserData.profile_picture_url;
            }
            
            // If the user authenticated with Facebook, try to get profile picture if not already set
            if (user.app_metadata?.provider === 'facebook' && !formData.profile_picture_url) {

                try {
                    const tokenData = await getFacebookToken(user.id);
                    if (tokenData?.accessToken) {
                        const pictureUrl = await getFacebookProfilePicture(
                            tokenData.accessToken,
                            tokenData.providerId,
                            user.id
                        );
                        
                        if (pictureUrl) {

                            formData.profile_picture_url = pictureUrl;
                        }
                    }
                } catch (picError) {
                    console.error('Error fetching Facebook profile picture:', picError);
                    // Continue without the picture
                }
            }

            const metadata = {
                ...formData.metadata,
                notification_preferences: {
                    email: formData.notification_email,
                    sms: formData.notification_sms
                },
                years_experience: formData.years_experience,
                title: formData.title
            };

            // Ensure roles is always an array with at least 'user'
            let rolesToSubmit = Array.isArray(formData.roles) && formData.roles.length > 0 
                ? [...formData.roles] // Create fresh copy
                : ['user'];
                
            // CRITICAL FIX: Force include crypto_investor if it was selected
            // This is needed because sometimes the role can get lost during form transitions
            const hasCryptoInvestor = 
                formData.roles?.includes('crypto_investor') || 
                document.querySelector('[aria-checked="true"][role="checkbox"]')?.textContent.includes('Crypto Investor');
                
            if (hasCryptoInvestor && !rolesToSubmit.includes('crypto_investor')) {

                rolesToSubmit.push('crypto_investor');
            }

            // Get roles from session storage as a backup
            const savedRoles = sessionStorage.getItem('selectedRoles');
            if (!rolesToSubmit.includes('crypto_investor') && savedRoles) {
                try {
                    const parsedRoles = JSON.parse(savedRoles);
                    if (Array.isArray(parsedRoles) && parsedRoles.includes('crypto_investor')) {

                        rolesToSubmit = parsedRoles;
                    }
                } catch (e) {
                    console.error('Error parsing saved roles during submit:', e);
                }
            }
            
            // Ensure user role is included
            if (!rolesToSubmit.includes('user')) {
                rolesToSubmit.push('user');
            }

            // Save to database with complete user data
            const dataToSubmit = {
                first_name: formData.first_name,
                last_name: formData.last_name,
                email: formData.email || user.email, // Ensure email is set
                alternate_email: formData.alternate_email,
                phone: formData.phone,
                city: formData.city,
                state: formData.state,
                zip_code: formData.zip_code,
                profile_type_id: formData.profile_type_id,
                interests: formData.interests,
                roles: rolesToSubmit, // Use our sanitized roles array
                profile_picture_url: formData.profile_picture_url,
                metadata: metadata,
                hasprofile: true,
                updated_at: new Date().toISOString(),
                // Preserve any existing Facebook data
                ...facebookData
            };

            // Verify all required fields are present before submission
            if (!dataToSubmit.first_name || !dataToSubmit.last_name) {
                throw new Error('First name and last name are required');
            }

            // Use our new utility function for more reliable saving
            const saveSuccess = await saveUserProfile(user.id, dataToSubmit);
            
            if (!saveSuccess) {
                throw new Error('Failed to save profile after multiple attempts');
            }


            
            // Remove all session storage items to prevent loop
            sessionStorage.clear();
            
            // Set the crypto investor flag in localStorage if needed for RoleSaver
            if (rolesToSubmit.includes('crypto_investor')) {
                localStorage.setItem('cryptoInvestorSelected', 'true');
            }
            
            // Reset dashboard load counter
            localStorage.setItem(`roleSaverRun_${user.id}`, 'true');
            
            // Use router.push instead of refreshing the page
            router.push('/dashboard');
        } catch (error) {
            console.error('Error creating profile:', error);
            setError('Failed to create profile: ' + error.message);
            setIsSubmitting(false);  // Only reset submitting state on error
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
