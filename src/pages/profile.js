import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import supabase from '../lib/supabase-setup';
import Layout from '../components/Layout';
import { useAuth } from '../context/auth-context';

const INTEREST_OPTIONS = ['Real Estate', 'Finance', 'Family', 'Gaming', 'Technology', 'Travel', 'Cooking', 'Sports', 'Music', 'Movies'];

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
  const router = useRouter();
  const { user, isAuthenticated, hasProfile, loading } = useAuth();
  const isSetup = router.query.setup === 'true';

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    if (!loading && isAuthenticated && hasProfile && isSetup) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, loading, hasProfile, router, isSetup]);

  useEffect(() => {
    if (user && !hasProfile) {
      setIsFirstTime(true);
    }
  }, [user, hasProfile]);

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
    e.preventDefault();
    if (!user?.id) return;

    try {
      const { error: upsertError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          first_name: firstName,
          last_name: lastName,
          city,
          state,
          zip_code,
          phone,
          alternate_email: alternateEmail,
          interests: interests.join(','),
          hasprofile: true,
          profile_type_id: 1,
          updated_at: new Date().toISOString()
        });
      if (upsertError) throw upsertError;
      setSuccess('Profile saved successfully!');
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err) {
      setError(err.message);
    }
  };

  const renderProfileCreationForm = () => (
    <div>
      {step === 1 && (
        <div>
          <h2 className="text-xl mb-4">Name Information</h2>
          <div className="mb-4">
            <label className="block text-gray-700 mb-1" htmlFor="firstName">First Name</label>
            <input id="firstName" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 transition" required />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 mb-1" htmlFor="lastName">Last Name</label>
            <input id="lastName" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 transition" required />
          </div>
          <button onClick={nextStep} className="bg-indigo-500 text-white py-3 px-6 rounded-lg hover:bg-indigo-600 transition-colors">
            Next
          </button>
        </div>
      )}
      {step === 2 && (
        <div>
          <h2 className="text-xl mb-4">Location Information</h2>
          <div className="mb-4">
            <label className="block text-gray-700 mb-1" htmlFor="city">City</label>
            <input id="city" type="text" value={city} onChange={(e) => setCity(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 transition" required />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 mb-1" htmlFor="state">State</label>
            <input id="state" type="text" value={state} onChange={(e) => setState(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 transition" required />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 mb-1" htmlFor="zipcode">Zipcode</label>
            <input id="zipcode" type="text" value={zip_code} onChange={(e) => setZip_code(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 transition" required />
          </div>
          <button onClick={prevStep} className="bg-gray-400 text-white py-3 px-6 rounded-lg hover:bg-gray-500 transition-colors mr-2">
            Previous
          </button>
          <button onClick={nextStep} className="bg-indigo-500 text-white py-3 px-6 rounded-lg hover:bg-indigo-600 transition-colors">
            Next
          </button>
        </div>
      )}
      {step === 3 && (
        <div>
          <h2 className="text-xl mb-4">Contact Information</h2>
          <div className="mb-4">
            <label className="block text-gray-700 mb-1" htmlFor="phone">Phone</label>
            <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 transition" />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 mb-1" htmlFor="alternateEmail">Alternate Email</label>
            <input id="alternateEmail" type="email" value={alternateEmail} onChange={(e) => setAlternateEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 transition" />
          </div>
          <button onClick={prevStep} className="bg-gray-400 text-white py-3 px-6 rounded-lg hover:bg-gray-500 transition-colors mr-2">
            Previous
          </button>
          <button onClick={nextStep} className="bg-indigo-500 text-white py-3 px-6 rounded-lg hover:bg-indigo-600 transition-colors">
            Next
          </button>
        </div>
      )}
      {step === 4 && (
        <div>
          <h2 className="text-xl mb-4">Preferences and Interests</h2>
          <div className="mb-4">
            <label className="block text-gray-700 mb-1">Interests</label>
            <div className="flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map(interest => (
                <button
                  key={interest}
                  type="button"
                  className={`py-2 px-4 rounded-full text-sm ${interests.includes(interest) ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  onClick={() => handleInterestChange(interest)}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>
          <button onClick={prevStep} className="bg-gray-400 text-white py-3 px-6 rounded-lg hover:bg-gray-500 transition-colors mr-2">
            Previous
          </button>
          <button onClick={handleProfileSubmit} className="bg-green-500 text-white py-3 px-6 rounded-lg hover:bg-green-600 transition-colors">
            Save Profile
          </button>
        </div>
      )}
    </div>
  );

  const renderProfilePage = () => (
    <div>
      <h1 className="text-3xl text-center mb-6">Your Profile</h1>
      <div className="max-w-md mx-auto p-6 bg-white/90 rounded-2xl shadow-lg">
        {profile ? (
          <>
            <div className="mb-4">
              <label className="block text-gray-700 mb-1">First Name</label>
              <p>{profile.first_name}</p>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-1">Last Name</label>
              <p>{profile.last_name}</p>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-1">City</label>
              <p>{profile.city}</p>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-1">State</label>
              <p>{profile.state}</p>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-1">Zipcode</label>
              <p>{profile.zip_code}</p>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-1">Phone</label>
              <p>{profile.phone}</p>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-1">Alternate Email</label>
              <p>{profile.alternate_email}</p>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-1">Interests</label>
              <p>{profile.interests}</p>
            </div>
          </>
        ) : (
          <p>Loading profile...</p>
        )}
      </div>
    </div>
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