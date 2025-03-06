import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/auth-context';
import supabase from '../lib/supabase-setup';

// Import Profile components
import ProgressStepper from '../components/Profile/ProgressStepper';
import ProfileForm from '../components/Profile/ProfileForm';
import RoleSelector from '../components/Profile/RoleSelector';
import InterestPicker from '../components/Profile/InterestPicker';
import ProfileView from '../components/Profile/ProfileView';

// Define profile steps
const steps = [
  { id: 'basic', title: 'Basic Info' },
  { id: 'location', title: 'Location' },
  { id: 'contact', title: 'Contact' },
  { id: 'roles', title: 'Roles' },
  { id: 'interests', title: 'Interests' }
];

// Define profile types for dropdown selection
const profileTypes = [
  { id: 1, name: 'Agent' },
  { id: 2, name: 'Broker' },
  { id: 3, name: 'Team Lead' },
  { id: 4, name: 'Admin' }
];

// Define available roles for selection
const availableRoles = [
  'user', 'agent', 'broker', 'admin', 'team-lead'
];

export default function ProfileSetup() {
  const { user, isAuthenticated, loading } = useAuth();
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
  const [isSetup] = useState(!!router.query.setup);
  const [profilePictureFetched, setProfilePictureFetched] = useState(false);

  useEffect(() => {
    // Redirect if not authenticated
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
    
    // Prefill email from user account
    if (user?.email && !formData.email) {
      setFormData(prev => ({...prev, email: user.email}));
    }
  }, [loading, isAuthenticated, user, router, formData.email]);

  useEffect(() => {
    // Load existing profile data if available
    const loadProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (error) throw error;
        
        if (data) {
          // Initialize form with existing user data, preserving defaults for missing fields
          const updatedData = {
            ...formData,
            ...Object.fromEntries(
              Object.entries(data).filter(([_, value]) => value !== null)
            )
          };
          
          // Make sure arrays and objects are handled correctly
          updatedData.interests = data.interests ? 
            (Array.isArray(data.interests) ? data.interests : [data.interests]) : 
            [];
            
          updatedData.roles = data.roles || ['user'];
          updatedData.metadata = data.metadata || {};
          
          setFormData(updatedData);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        setError('Failed to load your profile data. Please try again.');
      }
    };

    if (user) {
      loadProfile();
    }
  }, [user]);

  // Enhanced check for existing profile picture
  useEffect(() => {
    if (user && user.id) {
      const checkForProfilePicture = async () => {
        try {
          console.log("Checking for existing profile picture");
          // Check if user already has a profile picture in Supabase
          const { data, error } = await supabase
            .from('users')
            .select('profile_picture_url')
            .eq('id', user.id)
            .single();
            
          if (!error && data && data.profile_picture_url) {
            console.log("Found existing profile picture:", data.profile_picture_url);
            // We have a profile picture in the database
            setFormData(prev => ({
              ...prev,
              profile_picture_url: data.profile_picture_url
            }));
          } else if (user.identities || user.user_metadata?.identities) {
            // If no picture found but we have identities, try to fetch from Facebook
            console.log("No profile picture found, attempting to fetch from Facebook");
            
            // If we have a session object in localStorage, try to use its provider token
            const savedSession = localStorage.getItem('supabase.auth.token');
            let providerToken = null;
            
            if (savedSession) {
              try {
                const parsedSession = JSON.parse(savedSession);
                providerToken = parsedSession?.currentSession?.provider_token;
              } catch (e) {
                console.error("Error parsing saved session:", e);
              }
            }
            
            // Import and use the utility directly
            const { fetchAndStoreFacebookProfilePicture } = await import('../lib/facebook-utils');
            const pictureUrl = await fetchAndStoreFacebookProfilePicture(user, providerToken);
            
            if (pictureUrl) {
              setFormData(prev => ({
                ...prev,
                profile_picture_url: pictureUrl
              }));
            }
          }
        } catch (error) {
          console.error('Error checking for profile picture:', error);
        }
      };
      
      checkForProfilePicture();
    }
  }, [user]);

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
      if (!user) throw new Error('User not authenticated');

      // Prepare metadata with additional fields
      const metadata = {
        ...formData.metadata,
        notification_preferences: {
          email: formData.notification_email,
          sms: formData.notification_sms
        },
        years_experience: formData.years_experience,
        title: formData.title,
        updated_at: new Date().toISOString()
      };

      // Handle profile picture URL - process Facebook URL if necessary
      let finalProfilePictureUrl = formData.profile_picture_url;
      
      // Check if the URL is a Facebook platform-lookaside URL that might cause CORS issues
      if (finalProfilePictureUrl && finalProfilePictureUrl.includes('platform-lookaside.fbsbx.com')) {
        try {
          console.log('Detected Facebook platform URL, attempting to reprocess it');
          // Import the utility to handle Facebook images
          const { fetchAndStoreFacebookProfilePicture } = await import('../lib/facebook-utils');
          
          // Try to get a new Supabase-hosted URL
          const supabaseUrl = await fetchAndStoreFacebookProfilePicture(user);
          if (supabaseUrl) {
            console.log('Successfully reprocessed Facebook image to Supabase storage');
            finalProfilePictureUrl = supabaseUrl;
          } else {
            console.warn('Failed to process Facebook image, will try direct URL anyway');
          }
        } catch (picError) {
          console.error('Error processing profile picture:', picError);
          // Continue with original URL as fallback
        }
      }

      // Prepare all fields that exist in the users table
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
        title: formData.title,
        interests: formData.interests,
        roles: formData.roles,
        profile_picture_url: finalProfilePictureUrl,
        metadata: metadata,
        hasprofile: true,
        updated_at: new Date().toISOString()
      };

      console.log('Submitting profile with picture URL:', dataToSubmit.profile_picture_url);

      // Update the user profile
      const { error } = await supabase
        .from('users')
        .update(dataToSubmit)
        .eq('id', user.id);

      if (error) throw error;

      // Redirect to dashboard after successful profile setup
      router.push('/dashboard');
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile: ' + error.message);
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
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              {isSetup ? 'Complete Your Profile' : 'Edit Your Profile'}
            </h1>
            <p className="mt-2 text-gray-600">
              Let's get to know you better
            </p>
          </div>
          
          {/* Progress Stepper */}
          <ProgressStepper 
            steps={steps}
            currentStep={currentStep} 
            onStepClick={handleStepClick}
          />
          
          {/* Error message */}
          {error && (
            <div className="mb-6 p-3 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm">
              {error}
            </div>
          )}
          
          {/* Step content */}
          {renderCurrentStepContent()}
          
          {/* Preview profile at the bottom for reference */}
          {formData.first_name && formData.last_name && (
            <div className="mt-12 pt-6 border-t border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Profile Preview</h2>
              <ProfileView profile={formData} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}