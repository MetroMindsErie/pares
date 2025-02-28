import React from 'react';

const Reels = () => {
  return (
    <section className="p-10 bg-gray-100">
      <h2 className="text-3xl font-bold text-center mb-6">Reels</h2>
      <div className="flex flex-wrap justify-center">
        {/* Placeholder for reels */}
        <div className="w-full md:w-1/2 lg:w-1/3 p-4">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <video controls className="w-full h-64 object-cover rounded-lg">
              <source src="reel1.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            <h3 className="mt-4 text-xl font-semibold">Reel Title</h3>
            <p className="mt-2 text-gray-600">Description of the reel.</p>
          </div>
        </div>
        {/* Add more reels as needed */}
      </div>
    </section>
  );
};

export default Reels;
