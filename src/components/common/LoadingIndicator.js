import React from 'react';

const LoadingIndicator = ({ text = "Loading...", size = "40px" }) => {
  return (
    <div className="flex flex-col items-center justify-center py-6">
      <div className="flex items-center justify-center">
        <div 
          className="animate-pulse bg-blue-500 rounded-full" 
          style={{ width: size, height: size }}
        ></div>
      </div>
      {text && <p className="mt-4 font-medium text-gray-700">{text}</p>}
    </div>
  );
};

export default LoadingIndicator;
