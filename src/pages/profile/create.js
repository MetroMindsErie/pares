import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../../context/auth-context';
import ProfileForm from '../../components/Profile/ProfileForm';
import supabase from '../../lib/supabase-setup';

const CreateProfilePage = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user?.id) {
      router.push('/auth/login');
      return;
    }

    // Check if user already has a profile
    const checkProfile = async () => {
      const { data } = await supabase
        .from('users')
        .select('hasprofile')
        .eq('id', user.id)
        .single();

      if (data?.hasprofile) {
        router.push('/dashboard');
      }
    };

    checkProfile();
  }, [user, authLoading, router]);

  const handleSubmit = async (formData) => {
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('users')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          alternate_email: formData.alternateEmail,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zipCode,
          profile_type_id: formData.profileTypeId,
          hasprofile: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      router.push('/dashboard');
    } catch (error) {
      console.error('Error creating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="animate-spin h-10 w-10 border-4 border-teal-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Create Profile | PA Real Estate</title>
        <meta name="description" content="Create your profile to get started" />
      </Head>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Your Profile</h1>
          <p className="text-gray-600 mt-2">Let's get you set up with a profile</p>
          
          {/* Progress Bar */}
          <div className="mt-6 flex justify-center">
            <div className="flex space-x-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${
                    i <= step ? 'bg-teal-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <ProfileForm
          onSubmit={step === 3 ? handleSubmit : handleNext}
          onBack={handleBack}
          step={step}
        />
      </div>
    </div>
  );
};

export default CreateProfilePage;
