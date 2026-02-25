import React, { useState, useEffect } from 'react';

const interests = [
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

export default function InterestPicker({ selectedInterests = [], onChange, onBack, onSubmit }) {
  const [localSelected, setLocalSelected] = useState([...selectedInterests]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInterestToggle = (interestId) => {
    let updatedInterests;
    if (localSelected.includes(interestId)) {
      updatedInterests = localSelected.filter(id => id !== interestId);
    } else {
      updatedInterests = [...localSelected, interestId];
    }
    
    setLocalSelected(updatedInterests);
    if (onChange) onChange(updatedInterests);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit();
    } catch (error) {
      console.error('Error submitting profile:', error);
    } finally {
      // Keep showing loading state to prevent confusion during redirect
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Choose Your Interests</h3>
        <p className="mt-1 text-sm text-gray-500">
          Select the types of properties you're interested in.
        </p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {interests.map((interest) => {
          const isSelected = localSelected.includes(interest.id);
          
          return (
            <div 
              key={interest.id}
              onClick={() => handleInterestToggle(interest.id)}
              className={`p-3 border rounded-md cursor-pointer transition-colors ${
                isSelected 
                  ? 'border-teal-500 bg-teal-50' 
                  : 'border-gray-200 hover:border-teal-300 hover:bg-gray-50'
              }`}
              role="checkbox"
              aria-checked={isSelected}
              tabIndex={0}
            >
              <div className="flex items-center">
                <span className="text-2xl mr-2">{interest.icon}</span>
                <span className="font-medium">{interest.name}</span>
                {isSelected && (
                  <div className="ml-auto bg-teal-600 rounded-full p-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="flex justify-between mt-8">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 flex items-center"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating Profile...
            </>
          ) : (
            'Complete Profile'
          )}
        </button>
      </div>
    </div>
  );
}
