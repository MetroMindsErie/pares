import React from 'react';

const ProfileProgressBar = ({ steps, currentStep, onStepClick }) => {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {Array.from({ length: steps }, (_, i) => i + 1).map((stepNumber) => (
          <div
            key={stepNumber}
            className="flex flex-col items-center"
            onClick={() => onStepClick && onStepClick(stepNumber)}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                stepNumber <= currentStep
                  ? 'bg-indigo-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              } ${onStepClick && stepNumber <= currentStep ? 'cursor-pointer' : ''}`}
            >
              {stepNumber}
            </div>
            <div
              className={`text-xs mt-1 ${
                stepNumber <= currentStep ? 'text-indigo-500' : 'text-gray-500'
              }`}
            >
              Step {stepNumber}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 h-1 bg-gray-200 rounded-full">
        <div
          className="h-1 bg-indigo-500 rounded-full"
          style={{ width: `${((currentStep - 1) / (steps - 1)) * 100}%` }}
        />
      </div>
    </div>
  );
};

export default ProfileProgressBar;
