import React from 'react';

const LoadingCard = () => {
  return (
    <div className="absolute inset-0 w-full h-full">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden h-full flex flex-col animate-pulse">
        {/* Image skeleton */}
        <div className="h-1/2 bg-gray-200"></div>
        
        {/* Content skeleton */}
        <div className="flex-1 p-6 flex flex-col">
          <div className="flex-1">
            {/* Title skeleton */}
            <div className="h-6 bg-gray-200 rounded mb-4 w-3/4"></div>
            
            {/* Stats skeleton */}
            <div className="flex gap-4 mb-4">
              <div className="h-4 bg-gray-200 rounded w-16"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
              <div className="h-4 bg-gray-200 rounded w-20"></div>
            </div>
            
            {/* Description skeleton */}
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded w-4/5"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
          
          {/* Action buttons skeleton */}
          <div className="grid grid-cols-4 gap-3 mt-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingCard;
