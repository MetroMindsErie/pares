import React, { useState, useEffect } from 'react';

// Role definitions with RBAC mapping info
const roles = [
  { 
    id: 'user', 
    name: 'User', 
    description: 'Regular platform user - browse listings, save favorites, contact agents',
    tier: 'free',
    professional: false
  },
  { 
    id: 'agent', 
    name: 'Agent', 
    description: 'Real estate agent - list properties, manage listings, view analytics',
    tier: 'professional',
    professional: true,
    badge: 'Pro'
  },
  { 
    id: 'broker', 
    name: 'Broker', 
    description: 'Broker - manage agents, company dashboard, advanced features',
    tier: 'professional',
    professional: true,
    badge: 'Pro'
  },
  { 
    id: 'crypto_investor', 
    name: 'Crypto Investor', 
    description: 'Access fractional property investments via stablecoins',
    tier: 'professional',
    professional: true,
    badge: 'Pro'
  },
];

export default function RoleSelector({ selectedRoles = [], onChange, onNext, onBack }) {
  // Initialize with previously selected roles or defaults
  const [localSelectedRoles, setLocalSelectedRoles] = useState(() => {
    // Try to get roles from session storage first for persistence
    const savedRoles = typeof window !== 'undefined' ? 
      sessionStorage.getItem('selectedRoles') : null;
    
    if (savedRoles) {
      try {
        const parsedRoles = JSON.parse(savedRoles);
        if (Array.isArray(parsedRoles) && parsedRoles.length > 0) {
          return parsedRoles;
        }
      } catch (e) {
        console.error('Error parsing saved roles:', e);
      }
    }
    
    // Fall back to props or default
    return selectedRoles.length > 0 ? [...selectedRoles] : ['user'];
  });
  
  // Only log once when component mounts
  useEffect(() => {

  }, []);
  
  // Make sure we always have at least 'user' selected
  useEffect(() => {
    if (!localSelectedRoles.includes('user')) {
      const updatedRoles = [...localSelectedRoles, 'user'];
      setLocalSelectedRoles(updatedRoles);
      
      // Call the onChange handler to sync with parent component
      if (onChange) onChange(updatedRoles);
    }
  }, []);

  const handleRoleToggle = (roleId) => {
    // Never allow deselecting 'user' role
    if (roleId === 'user') return;
    
    let updatedRoles;
    if (localSelectedRoles.includes(roleId)) {
      updatedRoles = localSelectedRoles.filter(id => id !== roleId);
    } else {
      updatedRoles = [...localSelectedRoles, roleId];
    }
    
    // Update local state
    setLocalSelectedRoles(updatedRoles);
    
    // Save to session storage for persistence
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('selectedRoles', JSON.stringify(updatedRoles));
    }
    
    // Notify parent component of change
    if (onChange) onChange(updatedRoles);
  };

  // Handle the Next button click to ensure roles are saved
  const handleNext = () => {
    // Save to session storage one more time to ensure persistence
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('selectedRoles', JSON.stringify(localSelectedRoles));
      
      // Set a persistent flag if crypto investor was selected
      if (localSelectedRoles.includes('crypto_investor')) {
        localStorage.setItem('cryptoInvestorSelected', 'true');
      }
    }
    
    // Ensure parent component has the latest state before proceeding
    if (onChange) onChange([...localSelectedRoles]);
    
    // Proceed to next step
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Select Your Role(s)</h3>
        <p className="mt-1 text-sm text-gray-500">
          Choose the roles that best describe you. You can select multiple roles.
        </p>
      </div>
      
      <div className="space-y-4">
        {roles.map((role) => {
          const isSelected = localSelectedRoles.includes(role.id);
          const isUser = role.id === 'user';
          
          return (
            <div 
              key={role.id}
              onClick={() => handleRoleToggle(role.id)}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                isSelected 
                  ? 'border-teal-500 bg-teal-50' 
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              }`}
              role="checkbox"
              aria-checked={isSelected}
              tabIndex={0}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">{role.name}</h4>
                    {role.badge && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-800">
                        {role.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{role.description}</p>
                  {role.professional && (
                    <p className="text-xs text-teal-600 mt-1">
                      Upgrade to Professional plan to unlock full features
                    </p>
                  )}
                </div>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  isSelected ? 'bg-teal-600' : 'bg-gray-200'
                }`}>
                  {isSelected && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
              {isUser && (
                <div className="mt-2 text-xs text-gray-500 italic">
                  Base user role is required
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="mt-3 text-xs bg-gray-50 p-2 rounded">
        <strong>Selected Roles:</strong> {localSelectedRoles.join(', ')}
      </div>
      
      <div className="flex justify-between mt-8">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
