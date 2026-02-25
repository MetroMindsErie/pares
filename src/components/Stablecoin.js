import React from 'react';
const Stablecoin = () => {
  return (
    <section className="relative overflow-hidden rounded-lg" style={{
      backgroundImage: 'url(/pares5.jpeg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      paddingTop: '50%',
    }}>
      <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
        <div className="bg-white bg-opacity-75 p-8 rounded-lg shadow-xl max-w-5xl mx-auto text-center md:text-left">
          <h2 className="text-4xl md:text-5xl font-extrabold text-center mb-6 text-teal-900 hover:text-teal-500 transition duration-300">
            Discover EstateCoin: Your Key to Real Estate Riches
          </h2>
          <div className="max-w-4xl mx-auto">
            <h3 className="text-2xl md:text-3xl font-semibold mb-4 text-gray-800">Unlock Investment Opportunities</h3>
            <p className="mb-6 text-lg leading-relaxed text-gray-700">
              Tired of traditional investments? EstateCoin revolutionizes real estate investing by giving you direct access to property opportunities, powered by real-time MLS data.
            </p>
            <p className="mb-6 text-lg leading-relaxed text-gray-700">
              Imagine owning a piece of the future. EstateCoin makes it possible. Explore, invest, and grow your wealth with confidence.
            </p>
            <div className="text-center mt-8">
              <button className="bg-gradient-to-r from-teal-600 to-blue-800 text-white px-8 py-4 rounded-full font-semibold hover:from-teal-700 hover:to-blue-900 transition duration-300 shadow-md">
                Start Exploring Now!
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Stablecoin;