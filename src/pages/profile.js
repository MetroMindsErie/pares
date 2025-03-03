import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import supabase from '../lib/supabase-setup';
import Layout from '../components/Layout';
import { useAuth } from '../context/auth-context';
import ProfileForm from '../components/Profile/ProfileForm';
import ProgressStepper from '../components/Profile/ProgressStepper';
import RoleSelector from '../components/Profile/RoleSelector';
import InterestPicker from '../components/Profile/InterestPicker';
import ProfileView from '../components/Profile/ProfileView';

const PROFILE_STEPS = [
  { title: 'Basic Info', component: 'ProfileForm' },
  { title: 'Location', component: 'ProfileForm' },
  { title: 'Contact', component: 'ProfileForm' },
  { title: 'Role', component: 'RoleSelector' },
  { title: 'Interests', component: 'InterestPicker' }
];

export default function ProfilePage() {
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip_code, setZip_code] = useState('');
  const [phone, setPhone] = useState('');
  const [alternateEmail, setAlternateEmail] = useState('');
  const [interests, setInterests] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileType, setProfileType] = useState(null);
  const [roles, setRoles] = useState([]);
  const [metadata, setMetadata] = useState({});
  const [profilePictureUrl, setProfilePictureUrl] = useState('');
  const router = useRouter();
  const { user, isAuthenticated, hasProfile, loading, userPicture, saveUserPicture } = useAuth();
  const isSetup = router.query.setup === 'true';

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }
      
      // Only redirect to dashboard if user has profile and it's not a setup request
      if (hasProfile && !isSetup) {
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, loading, hasProfile, router, isSetup]);

  useEffect(() => {
    if (user && !hasProfile) {
      setIsFirstTime(true);
    }
  }, [user, hasProfile]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.id && !isFirstTime) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (data && !error) {
          setProfile(data);
        }
      }
    };

    fetchProfile();
  }, [user, isFirstTime]);

  useEffect(() => {
    if (user && !hasProfile && userPicture) {
      setProfilePictureUrl(userPicture);
    }
  }, [user, hasProfile, userPicture]);

  // Update the profile picture when available from auth
  useEffect(() => {
    if (user && userPicture && !profilePictureUrl) {
      setProfilePictureUrl(userPicture);
    }
  }, [user, userPicture]);

  const nextStep = () => {
    setStep(step + 1);
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const handleInterestChange = (interest) => {
    setInterests(prevInterests =>
      prevInterests.includes(interest)
        ? prevInterests.filter(item => item !== interest)
        : [...prevInterests, interest]
    );
  };

  const handleProfileSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!user?.id) return;

    try {
      const profile_picture_url = userPicture || profilePictureUrl;
      
      const { error: userError } = await supabase
        .from('users')
        .update({
          first_name: firstName,
          last_name: lastName,
          city,
          state,
          zip_code,
          phone,
          alternate_email: alternateEmail,
          interests,
          hasprofile: true,
          profile_type_id: profileType,
          roles,
          profile_picture_url,
          metadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (userError) throw userError;

      setSuccess('Profile saved successfully!');
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (err) {
      setError(err.message);
      console.error('Profile update error:', err);
    }
  };

  const handleFormSubmit = (formData) => {
    // Update state based on current step
    if (step === 1) {
      setFirstName(formData.firstName);
      setLastName(formData.lastName);
      setProfileType(formData.profileTypeId); // Add this line
    } else if (step === 2) {
      setCity(formData.city);
      setState(formData.state);
      setZip_code(formData.zipCode);
    } else if (step === 3) {
      setPhone(formData.phone);
      setAlternateEmail(formData.alternateEmail);
    }
    nextStep();
  };

  const renderProfileCreationForm = () => (
    <div className="space-y-8">
      <ProgressStepper 
        steps={PROFILE_STEPS} 
        currentStep={step} 
        onStepClick={setStep}
      />
      
      {step <= 3 && (
        <ProfileForm
          onSubmit={handleFormSubmit}
          onBack={prevStep}
          step={step}
          initialData={{
            first_name: firstName,
            last_name: lastName,
            city,
            state,
            zip_code,
            phone,
            alternate_email: alternateEmail
          }}
        />
      )}
      
      {step === 4 && (
        <RoleSelector
          selectedRoles={roles}
          onChange={setRoles}
          onNext={nextStep}
          onBack={prevStep}
        />
      )}
      
      {step === 5 && (
        <InterestPicker
          selectedInterests={interests}
          onChange={setInterests}
          onBack={prevStep}
          onSubmit={handleProfileSubmit}
        />
      )}
    </div>
  );

  const renderProfilePage = () => (
    <ProfileView profile={profile} />
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <div>Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto mt-16 p-6 bg-white/90 rounded-2xl shadow-lg">
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-center">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded text-center">{success}</div>}
        {isFirstTime ? renderProfileCreationForm() : renderProfilePage()}
      </div>
    </Layout>
  );
}