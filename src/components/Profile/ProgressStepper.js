import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

const ProgressStepper = ({ steps, currentStep, onStepClick }) => {
  return (
    <div className="w-full mb-8 px-4">
      <div className="flex justify-between relative">
        {/* Progress Line Background */}
        <div className="absolute top-4 left-0 h-1 bg-gray-200 w-full -z-10" />
        
        {/* Animated Progress Line */}
        <div className="absolute top-4 left-0 h-1 w-full -z-5">
          <motion.div
            className="h-full bg-indigo-600 rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Steps */}
        {steps.map((step, index) => (
          <motion.div
            key={step.title}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
            className="relative flex flex-col items-center"
          >
            <button
              onClick={() => onStepClick(index + 1)}
              disabled={currentStep < index + 1}
              className={`w-8 h-8 rounded-full flex items-center justify-center z-10
                ${currentStep > index + 1 
                  ? 'bg-indigo-600 text-white' 
                  : currentStep === index + 1
                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                    : 'bg-white border-2 border-gray-300 text-gray-400'
                } transition-all duration-200`}
            >
              {currentStep > index + 1 ? (
                <CheckCircleIcon className="w-5 h-5" />
              ) : (
                index + 1
              )}
            </button>
            <span className={`absolute -bottom-6 text-sm font-medium whitespace-nowrap
              ${currentStep === index + 1 ? 'text-indigo-600' : 'text-gray-500'}`}>
              {step.title}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ProgressStepper;
