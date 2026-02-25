import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../../context/auth-context';
import supabase from '../../lib/supabase-setup';
import Layout from '../../components/Layout';
import { mapLegacyRoles } from '../../lib/authorizationUtils';

/* ─── Constants ─────────────────────────────────────────────────────────────── */

const PROFILE_TYPES = [
  { id: 1, type: 'buyer', label: 'Buyer', icon: '🏠' },
  { id: 2, type: 'seller', label: 'Seller', icon: '📋' },
  { id: 3, type: 'agent', label: 'Agent', icon: '🤝' },
];

const ROLES = [
  { id: 'user', name: 'User', description: 'Regular platform user', locked: true },
  { id: 'agent', name: 'Agent', description: 'Real estate agent', badge: 'Pro' },
  { id: 'broker', name: 'Broker', description: 'Broker', badge: 'Pro' },
  { id: 'crypto_investor', name: 'Crypto Investor', description: 'Crypto property investments', badge: 'Pro' },
];

const INTERESTS = [
  { id: 'residential', name: 'Residential', icon: '🏠' },
  { id: 'commercial', name: 'Commercial', icon: '🏢' },
  { id: 'investment', name: 'Investment Properties', icon: '💰' },
  { id: 'vacation', name: 'Vacation Homes', icon: '🏝️' },
  { id: 'luxury', name: 'Luxury Properties', icon: '💎' },
  { id: 'renovation', name: 'Fixer-Uppers', icon: '🔨' },
  { id: 'new_construction', name: 'New Construction', icon: '🏗️' },
  { id: 'foreclosure', name: 'Foreclosures', icon: '🏦' },
  { id: 'rental', name: 'Rental Properties', icon: '🔑' },
];

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
];

/* ─── Page ──────────────────────────────────────────────────────────────────── */

export default function ProfileSettings() {
  const { user, isAuthenticated, loading: authLoading, authChecked } = useAuth();
  const router = useRouter();

  const [profileData, setProfileData] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  /* ── Redirect if not authed ──────────────────────────────────────────────── */
  useEffect(() => {
    if (authChecked && !authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authChecked, authLoading, isAuthenticated, router]);

  /* ── Load existing profile ───────────────────────────────────────────────── */
  const loadProfile = useCallback(async () => {
    if (!user?.id) return;
    setLoadingProfile(true);
    try {
      const { data, error: fetchErr } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchErr) throw fetchErr;

      setProfileData(data);
      setForm({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || user.email || '',
        alternate_email: data.alternate_email || '',
        phone: data.phone || '',
        city: data.city || '',
        state: data.state || '',
        zip_code: data.zip_code || '',
        profile_type_id: data.profile_type_id || 1,
        roles: Array.isArray(data.roles) ? data.roles : ['user'],
        interests: Array.isArray(data.interests) ? data.interests : [],
        notification_email: data.metadata?.notification_preferences?.email ?? true,
        notification_sms: data.metadata?.notification_preferences?.sms ?? false,
      });
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile data');
    } finally {
      setLoadingProfile(false);
    }
  }, [user]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  /* ── Input handlers ──────────────────────────────────────────────────────── */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setSaved(false);
  };

  const toggleRole = (roleId) => {
    if (roleId === 'user') return; // can't deselect base role
    setForm(prev => {
      const roles = prev.roles.includes(roleId)
        ? prev.roles.filter(r => r !== roleId)
        : [...prev.roles, roleId];
      return { ...prev, roles };
    });
    setSaved(false);
  };

  const toggleInterest = (interestId) => {
    setForm(prev => {
      const interests = prev.interests.includes(interestId)
        ? prev.interests.filter(i => i !== interestId)
        : [...prev.interests, interestId];
      return { ...prev, interests };
    });
    setSaved(false);
  };

  /* ── Save via server-side API (bypasses RLS) ──────────────────────────────── */
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      if (!user?.id) throw new Error('Not authenticated — please log in again.');

      let rbacRole = 'basic_user';
      let rbacProfType = null;
      try {
        const rbacMapping = mapLegacyRoles(form.roles || ['user']);
        rbacRole = rbacMapping.role;
        rbacProfType = rbacMapping.professional_type;
      } catch (mapErr) {
        console.warn('mapLegacyRoles error, using defaults:', mapErr);
      }

      const dataToSubmit = {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        alternate_email: form.alternate_email,
        phone: form.phone,
        city: form.city,
        state: form.state,
        zip_code: form.zip_code,
        profile_type_id: form.profile_type_id,
        roles: form.roles,
        interests: form.interests,
        metadata: {
          ...(profileData?.metadata || {}),
          notification_preferences: {
            email: form.notification_email,
            sms: form.notification_sms,
          },
        },
        hasprofile: true,
        role: rbacRole,
        professional_type: rbacProfType,
        is_active: true,
      };

      // Use AbortController for a 15-second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch('/api/users/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, profileData: dataToSubmit }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      let result;
      try {
        result = await res.json();
      } catch (_jsonErr) {
        throw new Error(`Server returned status ${res.status} with non-JSON body`);
      }

      if (!res.ok) throw new Error(result.error || 'Save failed');

      setSaving(false);
      alert('Profile updated successfully!');
      router.push('/dashboard');
      return;
    } catch (err) {
      if (err.name === 'AbortError') {
        console.error('Profile save timed out');
        setError('Request timed out — please try again.');
      } else {
        console.error('Error saving profile:', err);
        setError(err.message || 'Failed to save changes. Please try again.');
      }
      setSaving(false);
    }
  };

  /* ── Loading / Auth states ───────────────────────────────────────────────── */
  if (authLoading || loadingProfile) {
    return (
      <Layout>
        <div className="min-h-screen flex justify-center items-center bg-gray-50">
          <div className="animate-spin h-10 w-10 border-4 border-teal-500 rounded-full border-t-transparent" />
        </div>
      </Layout>
    );
  }

  /* ── Render ──────────────────────────────────────────────────────────────── */
  return (
    <Layout>
      <Head>
        <title>Profile Settings | pares.homes</title>
      </Head>

      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
              <p className="mt-1 text-sm text-gray-500">
                Update any field you'd like — leave the rest as-is.
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Dashboard
            </button>
          </div>

          {/* Alerts */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>
          )}
          {saved && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-700 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Changes saved successfully!
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">

            {/* ─── Section: Personal Info ─────────────────────────────────── */}
            <Section title="Personal Information" icon="👤">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="First Name" name="first_name" value={form.first_name} onChange={handleChange} required />
                <Field label="Last Name" name="last_name" value={form.last_name} onChange={handleChange} required />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} required />
                <Field label="Alternate Email" name="alternate_email" type="email" value={form.alternate_email} onChange={handleChange} />
              </div>

              <Field label="Phone" name="phone" type="tel" value={form.phone} onChange={handleChange} />
            </Section>

            {/* ─── Section: Location ──────────────────────────────────────── */}
            <Section title="Location" icon="📍">
              <Field label="City" name="city" value={form.city} onChange={handleChange} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">State</label>
                  <select
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-sm"
                  >
                    <option value="">Select state…</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <Field label="ZIP Code" name="zip_code" value={form.zip_code} onChange={handleChange} />
              </div>
            </Section>

            {/* ─── Section: Profile Type ──────────────────────────────────── */}
            <Section title="Profile Type" icon="🏷️">
              <div className="grid grid-cols-3 gap-3">
                {PROFILE_TYPES.map(pt => (
                  <button
                    key={pt.id}
                    type="button"
                    onClick={() => { setForm(prev => ({ ...prev, profile_type_id: pt.id })); setSaved(false); }}
                    className={`p-3 rounded-lg border-2 text-center transition-all ${
                      form.profile_type_id === pt.id
                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                        : 'border-gray-200 hover:border-teal-300 text-gray-600'
                    }`}
                  >
                    <span className="text-xl">{pt.icon}</span>
                    <p className="text-sm font-medium mt-1">{pt.label}</p>
                  </button>
                ))}
              </div>
            </Section>

            {/* ─── Section: Roles ──────────────────────────────────────────── */}
            <Section title="Roles" icon="🎭">
              <p className="text-xs text-gray-500 mb-3">Select additional roles. The base "User" role is always active.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ROLES.map(role => {
                  const selected = form.roles?.includes(role.id);
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => toggleRole(role.id)}
                      disabled={role.locked}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        selected
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-gray-200 hover:border-teal-300'
                      } ${role.locked ? 'opacity-60 cursor-default' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-gray-900">{role.name}</span>
                        <div className="flex items-center gap-1.5">
                          {role.badge && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-teal-100 text-teal-700">{role.badge}</span>
                          )}
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${selected ? 'bg-teal-600' : 'bg-gray-200'}`}>
                            {selected && (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{role.description}</p>
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* ─── Section: Interests ─────────────────────────────────────── */}
            <Section title="Interests" icon="⭐">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {INTERESTS.map(interest => {
                  const selected = form.interests?.includes(interest.id);
                  return (
                    <button
                      key={interest.id}
                      type="button"
                      onClick={() => toggleInterest(interest.id)}
                      className={`p-2.5 rounded-lg border-2 text-left transition-all text-sm ${
                        selected
                          ? 'border-teal-500 bg-teal-50 text-teal-700'
                          : 'border-gray-200 hover:border-teal-300 text-gray-600'
                      }`}
                    >
                      <span className="mr-1.5">{interest.icon}</span>
                      {interest.name}
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* ─── Section: Notifications ─────────────────────────────────── */}
            <Section title="Notifications" icon="🔔">
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="notification_email"
                    checked={form.notification_email ?? true}
                    onChange={handleChange}
                    className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-700">Email notifications</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="notification_sms"
                    checked={form.notification_sms ?? false}
                    onChange={handleChange}
                    className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-700">SMS notifications</span>
                </label>
              </div>
            </Section>

            {/* ─── Sticky Save Bar ────────────────────────────────────────── */}
            <div className="sticky bottom-4 z-10">
              <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-teal-500 to-green-500 rounded-lg hover:from-teal-600 hover:to-green-600 transition-all disabled:opacity-60 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent" />
                      Saving…
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}

/* ─── Reusable components ───────────────────────────────────────────────────── */

function Section({ title, icon, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <span>{icon}</span> {title}
        </h2>
      </div>
      <div className="p-5 space-y-4">
        {children}
      </div>
    </div>
  );
}

function Field({ label, name, value, onChange, type = 'text', required = false }) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        id={name}
        type={type}
        name={name}
        value={value || ''}
        onChange={onChange}
        required={required}
        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm transition-colors"
      />
    </div>
  );
}
