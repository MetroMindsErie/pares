import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/auth-context';
import supabase from '../lib/supabase-setup';
import ProfileForm from '../components/Profile/ProfileForm';
import RoleSelector from '../components/Profile/RoleSelector';
import InterestPicker from '../components/Profile/InterestPicker';
// Remove or comment out the unused import
// import ProfileTypeSelector from '../components/Profile/ProfileTypeSelector';
import ProfileProgressBar from '../components/Profile/ProfileProgressBar';
import { getFacebookToken, getFacebookProfilePicture } from '../services/facebookService';
import Navbar from '../components/Navbar';
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

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  // Prefill email from user account
  useEffect(() => {
    if (user?.email && !formData.email) {
      setFormData(prev => ({...prev, email: user.email}));
    }
  }, [user, formData.email]);

  // Load existing profile data
  useEffect(() => {
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
          // Initialize form with existing user data
          const updatedData = {
            ...formData,
            ...Object.fromEntries(
              Object.entries(data).filter(([_, value]) => value !== null)
            )
          };
          
          // Make sure arrays are handled correctly
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
  }, [user, formData]);

  // Try to get profile picture from Facebook if available
  useEffect(() => {
    const fetchProfilePicture = async () => {
      if (!user || !user.id || profilePictureFetched) return;
      
      try {
        // Check if user already has a profile picture
        const { data } = await supabase
          .from('users')
          .select('profile_picture_url')
          .eq('id', user.id)
          .single();
          
        if (data?.profile_picture_url) {
          setFormData(prev => ({
            ...prev,
            profile_picture_url: data.profile_picture_url
          }));
          setProfilePictureFetched(true);
          return;
        }
        
        // If the user signed up with Facebook, get their profile picture
        if (user.app_metadata?.provider === 'facebook') {
          const tokenData = await getFacebookToken(user.id);
          
          if (tokenData?.accessToken) {
            const pictureUrl = await getFacebookProfilePicture(
              tokenData.accessToken, 
              tokenData.providerId
            );
            
            if (pictureUrl) {
              setFormData(prev => ({
                ...prev,
                profile_picture_url: pictureUrl
              }));
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
    console.log('Role selection changed in profile page:', selectedRoles);
    
    // Ensure we're capturing the full array with a fresh copy
    setFormData(prevState => {
        const newData = {
            ...prevState,
            roles: [...selectedRoles]
        };
        console.log('Updated profile formData with roles:', newData.roles);
        return newData;
    });
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
            title: formData.title
        };

        // Ensure roles is always an array with at least 'user'
        const rolesToSubmit = Array.isArray(formData.roles) && formData.roles.length > 0
            ? [...formData.roles] // Create a fresh copy
            : ['user'];
        
        console.log('Final roles before submission:', rolesToSubmit);

        // Save to database with verified roles array
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
            roles: rolesToSubmit,
            profile_picture_url: formData.profile_picture_url,
            metadata: metadata,
            hasprofile: true,
            updated_at: new Date().toISOString()
        };

        console.log('Updating profile with final roles:', dataToSubmit.roles);

        const { error } = await supabase
            .from('users')
            .update(dataToSubmit)
            .eq('id', user.id);

        if (error) {
            console.error('Supabase update error:', error);
            throw error;
        }

        // Verify the save was successful
        const { data: verifyData, error: verifyError } = await supabase
            .from('users')
            .select('roles')
            .eq('id', user.id)
            .single();
            
        if (verifyError) {
            console.error('Error verifying saved roles:', verifyError);
        } else {
            console.log('VERIFICATION - Roles saved in database:', verifyData.roles);
        }

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
    <Navbar></Navbar>
      <div className="max-w-3xl mx-auto">
        <div className="space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              {isSetup ? 'Complete Your Profile' : 'Edit Your Profile'}
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              {isSetup 
                ? 'Please provide your information to get started.' 
                : 'Update your profile information below.'}
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
  );
}