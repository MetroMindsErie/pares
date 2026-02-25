import React from 'react';

const PROFILE_TYPES = [
  { id: 1, name: 'Agent', description: 'Real estate agent or broker' },
  { id: 2, name: 'Buyer', description: 'Looking to purchase property' },
  { id: 3, name: 'Seller', description: 'Looking to sell property' },
  { id: 4, name: 'Investor', description: 'Looking for investment opportunities' },
];

const ProfileTypeSelector = ({ selectedType, onChange, onNext, onBack }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Select your profile type</h3>
        <p className="mt-1 text-sm text-gray-500">
          This helps us personalize your experience
        </p>
      </div>

      <div className="space-y-4">
        {PROFILE_TYPES.map((type) => (
          <div
            key={type.id}
            className={`p-4 border rounded-lg cursor-pointer transition-all ${
              selectedType === type.id
                ? 'border-teal-500 bg-teal-50'
                : 'border-gray-200 hover:border-teal-300'
            }`}
            onClick={() => onChange(type.id)}
          >
            <div className="flex items-center">
              <div
                className={`w-5 h-5 rounded-full border ${
                  selectedType === type.id
                    ? 'border-teal-500 bg-teal-500'
                    : 'border-gray-400'
                } mr-3 flex items-center justify-center`}
              >
                {selectedType === type.id && (
                  <span className="text-white text-xs">✓</span>
                )}
              </div>
              <div>
                <h4 className="font-medium text-gray-900">{type.name}</h4>
                <p className="text-sm text-gray-500">{type.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!selectedType}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default ProfileTypeSelector;
