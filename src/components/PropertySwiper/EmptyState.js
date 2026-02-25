import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faRedo } from '@fortawesome/free-solid-svg-icons';

const EmptyState = ({ onReset }) => {
  return (
    <div className="absolute inset-0 w-full h-full">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden h-full flex flex-col items-center justify-center p-8 text-center">
        <FontAwesomeIcon 
          icon={faHome} 
          className="text-6xl text-gray-300 mb-6" 
        />
        
        <h3 className="text-2xl font-bold text-gray-800 mb-4">
          No More Properties
        </h3>
        
        <p className="text-gray-600 mb-8 max-w-sm">
          You've seen all available properties in this area. Try adjusting your search criteria or reset to see properties again.
        </p>
        
        <div className="space-y-3 w-full max-w-xs">
          <button
            onClick={onReset}
            className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 px-6 rounded-xl transition-colors"
          >
            <FontAwesomeIcon icon={faRedo} />
            Reset & Start Over
          </button>
          
          <button
            onClick={() => window.history.back()}
            className="w-full border border-gray-300 hover:border-gray-400 text-gray-700 font-medium py-3 px-6 rounded-xl transition-colors"
          >
            Change Search
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmptyState;
