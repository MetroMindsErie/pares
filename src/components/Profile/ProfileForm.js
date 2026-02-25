import { useState } from 'react';

const PROFILE_TYPES = [
  { id: 1, type: 'buyer', label: 'Buyer' },
  { id: 2, type: 'seller', label: 'Seller' },
  { id: 3, type: 'agent', label: 'Agent' }
];

const ProfileForm = ({ onSubmit, initialData = {}, onBack, step }) => {
  const [formData, setFormData] = useState({
    firstName: initialData.first_name || '',
    lastName: initialData.last_name || '',
    email: initialData.email || '',
    alternateEmail: initialData.alternate_email || '',
    phone: initialData.phone || '',
    bio: initialData.bio || '',
    city: initialData.city || '',
    state: initialData.state || '',
    zipCode: initialData.zip_code || '',
    profileTypeId: initialData.profile_type_id || null,
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSubmit(formData);
    }} className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 gap-6">
          {step === 1 && (
            <>
              {/* Profile Type Selection */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">Select Your Role</label>
                <div className="grid grid-cols-1 gap-3">
                  {PROFILE_TYPES.map((type) => (
                    <label
                      key={type.id}
                      className={`relative flex p-4 border rounded-lg cursor-pointer transition-colors
                        ${formData.profileTypeId === type.id 
                          ? 'border-teal-600 bg-teal-50' 
                          : 'border-gray-200 hover:border-teal-300'}`}
                    >
                      <input
                        type="radio"
                        name="profileTypeId"
                        value={type.id}
                        checked={formData.profileTypeId === type.id}
                        onChange={(e) => handleChange({
                          target: {
                            name: 'profileTypeId',
                            value: Number(e.target.value)
                          }
                        })}
                        className="sr-only"
                      />
                      <div className="flex items-center">
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">{type.label}</p>
                          <p className="text-gray-500">{type.description}</p>
                        </div>
                      </div>
                      <div className={`absolute inset-y-0 right-4 flex items-center
                        ${formData.profileTypeId === type.id ? 'text-teal-600' : 'text-gray-400'}`}
                      >
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    required
                  />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  required
                />
              </div>
              {/* State and ZIP inputs with same styling */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">State</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">ZIP Code</label>
                <input
                  type="text"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  required
                />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Alternate Email</label>
                <input
                  type="email"
                  name="alternateEmail"
                  value={formData.alternateEmail}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-center pt-4">
        {step > 1 && (
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
        )}
        <button
          type="submit"
          className="mx-auto px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          {step === 3 ? 'Next Step' : 'Continue'}
        </button>
      </div>
    </form>
  );
};

export default ProfileForm;
