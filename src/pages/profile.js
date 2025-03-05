import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/auth-context';
import supabase from '../lib/supabase-setup';
import { CheckIcon } from 'lucide-react';

const steps = [
  { id: 'basic', name: 'Basic Info', description: 'Name and email' },
  { id: 'contact', name: 'Contact', description: 'Phone and address' },
  { id: 'business', name: 'Business', description: 'Company details' },
  { id: 'preferences', name: 'Preferences', description: 'Personalize experience' },
  { id: 'review', name: 'Review', description: 'Review and submit' },
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
  const [step, setStep] = useState(0);
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

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };
  
  const handleMultiSelect = (name, value, isSelected) => {
    setFormData(prev => {
      const currentValues = prev[name] || [];
      if (isSelected) {
        return {...prev, [name]: [...currentValues, value]};
      } else {
        return {...prev, [name]: currentValues.filter(v => v !== value)};
      }
    });
  };

  // Add specialized handler for roles array
  const handleRoleToggle = (role) => {
    setFormData(prev => {
      const currentRoles = [...(prev.roles || [])];
      if (currentRoles.includes(role)) {
        return { ...prev, roles: currentRoles.filter(r => r !== role) };
      } else {
        return { ...prev, roles: [...currentRoles, role] };
      }
    });
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setStep(prev => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handlePrev = () => {
    setStep(prev => Math.max(prev - 1, 0));
  };

  const validateCurrentStep = () => {
    // Clear previous errors
    setError(null);
    
    // Validation for each step
    if (step === 0) {
      // Basic info validation
      if (!formData.first_name || !formData.last_name) {
        setError('First name and last name are required');
        return false;
      }
    } else if (step === 1) {
      // Contact validation
      if (!formData.phone) {
        setError('Phone number is required');
        return false;
      }
    }
    // Add validation for other steps as needed
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateCurrentStep()) {
      return;
    }
    
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
        title: formData.title, // Store title in metadata as a fallback
        updated_at: new Date().toISOString()
      };

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
        title: formData.title, // Now we can include title since we added it to DB
        interests: formData.interests,
        roles: formData.roles,
        profile_picture_url: formData.profile_picture_url,
        metadata: metadata,
        hasprofile: true,
        updated_at: new Date().toISOString()
      };

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

  const renderStepContent = () => {
    switch (step) {
      case 0: // Basic info
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">First Name</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={!!user?.email}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                />
                {user?.email && (
                  <p className="mt-1 text-xs text-gray-500">Email address from your account</p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Alternate Email</label>
                <input
                  type="email"
                  name="alternate_email"
                  value={formData.alternate_email || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">Optional alternate contact email</p>
              </div>
            </div>
          </div>
        );
      
      case 1: // Contact info
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="grid grid-cols-6 gap-6">
              <div className="col-span-6 sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="col-span-6 sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">State</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="col-span-6 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700">ZIP</label>
                <input
                  type="text"
                  name="zip_code"
                  value={formData.zip_code}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        );
      
      case 2: // Business info
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Profile Type</label>
              <select
                name="profile_type_id"
                value={formData.profile_type_id}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {profileTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Job Title</label>
              <input
                type="text"
                name="title"
                value={formData.title || ''}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Years of Experience</label>
              <input
                type="number"
                name="years_experience"
                value={formData.years_experience || ''}
                onChange={handleChange}
                min="0"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Roles</label>
              <p className="text-xs text-gray-500 mb-2">Select all that apply</p>
              
              <div className="space-y-2">
                {availableRoles.map((role) => (
                  <div key={role} className="flex items-center">
                    <input
                      id={`role-${role}`}
                      type="checkbox"
                      checked={(formData.roles || []).includes(role)}
                      onChange={() => handleRoleToggle(role)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`role-${role}`} className="ml-2 text-sm text-gray-700 capitalize">
                      {role.replace('-', ' ')}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      
      case 3: // Preferences
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Notification Preferences</h3>
              
              <div className="mt-4 space-y-4">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="notification_email"
                      name="notification_email"
                      type="checkbox"
                      checked={formData.notification_email || false}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="notification_email" className="font-medium text-gray-700">Email notifications</label>
                    <p className="text-gray-500">Get notified via email about account activity.</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="notification_sms"
                      name="notification_sms"
                      type="checkbox"
                      checked={formData.notification_sms || false}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="notification_sms" className="font-medium text-gray-700">SMS notifications</label>
                    <p className="text-gray-500">Receive text messages for time-sensitive updates.</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Interests</h3>
              <p className="text-sm text-gray-500">Select areas of interest to customize your experience.</p>
              
              <div className="mt-4 grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-4">
                {['Residential', 'Commercial', 'Investment', 'Property Management', 'Luxury Homes', 'New Construction'].map((interest) => (
                  <div key={interest} className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id={`interest-${interest}`}
                        type="checkbox"
                        checked={(formData.interests || []).includes(interest)}
                        onChange={(e) => handleMultiSelect('interests', interest, e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor={`interest-${interest}`} className="font-medium text-gray-700">{interest}</label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Profile Picture</h3>
              <div className="mt-2">
                <input
                  type="text"
                  name="profile_picture_url"
                  value={formData.profile_picture_url || ''}
                  onChange={handleChange}
                  placeholder="https://example.com/profile-image.jpg"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">Enter a URL for your profile picture</p>
              </div>
            </div>
          </div>
        );
      
      case 4: // Review - update to show all fields
        return (
          <div className="space-y-6">
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Profile Summary</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">Please review your information before submitting.</p>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                <dl className="sm:divide-y sm:divide-gray-200">
                  <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Full name</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{formData.first_name} {formData.last_name}</dd>
                  </div>
                  
                  <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Email address</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                      {formData.email}
                      {formData.alternate_email && (
                        <div className="mt-1 text-xs text-gray-500">Alt: {formData.alternate_email}</div>
                      )}
                    </dd>
                  </div>
                  
                  <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Phone number</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{formData.phone}</dd>
                  </div>
                  
                  <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Location</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                      {[formData.city, formData.state, formData.zip_code].filter(Boolean).join(', ')}
                    </dd>
                  </div>
                  
                  <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Profile Type</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                      {profileTypes.find(t => t.id === formData.profile_type_id)?.name || 'Not specified'}
                    </dd>
                  </div>
                  
                  {formData.title && (
                    <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500">Title</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{formData.title}</dd>
                    </div>
                  )}
                  
                  <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Years Experience</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                      {formData.years_experience || 'Not specified'}
                    </dd>
                  </div>

                  <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Roles</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                      {formData.roles?.map(role => (
                        <span key={role} className="inline-block px-2 py-1 mr-1 mb-1 bg-blue-100 text-blue-700 rounded">
                          {role}
                        </span>
                      ))}
                    </dd>
                  </div>
                  
                  <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Interests</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                      {formData.interests?.length 
                        ? formData.interests.join(', ') 
                        : 'None specified'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="space-y-8">
          {/* Progress bar */}
          <nav aria-label="Progress">
            <ol role="list" className="flex items-center">
              {steps.map((stepItem, stepIdx) => (
                <li key={stepItem.name} className={`${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''} relative`}>
                  {step > stepIdx ? (
                    // Completed step
                    <>
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="h-0.5 w-full bg-blue-600" />
                      </div>
                      <div
                        className="relative w-8 h-8 flex items-center justify-center bg-blue-600 rounded-full"
                      >
                        <CheckIcon className="w-5 h-5 text-white" aria-hidden="true" />
                        <span className="sr-only">{stepItem.name}</span>
                      </div>
                    </>
                  ) : step === stepIdx ? (
                    // Current step
                    <>
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="h-0.5 w-full bg-gray-200" />
                      </div>
                      <div
                        className="relative w-8 h-8 flex items-center justify-center bg-white border-2 border-blue-600 rounded-full"
                        aria-current="step"
                      >
                        <span className="h-2.5 w-2.5 bg-blue-600 rounded-full" aria-hidden="true" />
                        <span className="sr-only">{stepItem.name}</span>
                      </div>
                    </>
                  ) : (
                    // Upcoming step
                    <>
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="h-0.5 w-full bg-gray-200" />
                      </div>
                      <div
                        className="group relative w-8 h-8 flex items-center justify-center bg-white border-2 border-gray-300 rounded-full hover:border-gray-400"
                      >
                        <span className="h-2.5 w-2.5 bg-transparent rounded-full group-hover:bg-gray-300" aria-hidden="true" />
                        <span className="sr-only">{stepItem.name}</span>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ol>
          </nav>
          
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              {/* Step title */}
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900">{steps[step].name}</h2>
                <p className="mt-1 text-sm text-gray-500">{steps[step].description}</p>
              </div>
              
              {/* Error message */}
              {error && (
                <div className="mb-6 p-3 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm">
                  {error}
                </div>
              )}
              
              {/* Step content */}
              <form onSubmit={handleSubmit}>
                {renderStepContent()}
                
                {/* Navigation */}
                <div className="mt-8 flex justify-between">
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={step === 0}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Back
                  </button>
                  
                  {step < steps.length - 1 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Continue
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Submitting...' : 'Complete Profile'}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}