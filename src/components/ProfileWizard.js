// components/ProfileWizard.jsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircleIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const ProfileWizard = ({ steps, currentStep, setCurrentStep }) => {
  return (
    <div className="w-full mb-8">
      <div className="flex justify-between">
        {steps.map((step, index) => (
          <div key={step.title} className="flex flex-col items-center w-1/5">
            <button
              onClick={() => setCurrentStep(index + 1)}
              className={`w-8 h-8 rounded-full flex items-center justify-center 
                ${currentStep > index + 1 ? 'bg-green-500 text-white' : 
                currentStep === index + 1 ? 'bg-teal-600 text-white' : 
                'bg-gray-200 text-gray-500'}`}
            >
              {currentStep > index + 1 ? (
                <CheckCircleIcon className="w-5 h-5" />
              ) : (
                index + 1
              )}
            </button>
            <span className={`text-sm mt-2 text-center ${currentStep === index + 1 ? 'font-medium text-teal-600' : 'text-gray-500'}`}>
              {step.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};