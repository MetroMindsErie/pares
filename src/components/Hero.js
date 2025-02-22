import { useEffect, useState } from 'react';

export function Hero() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true); // Set isClient to true after the component mounts
  }, []);

  if (!isClient) {
    return null; // Return nothing during SSR
  }

  return (
    <section className="flex flex-col items-center justify-center h-screen bg-cover bg-center text-black">
      <h1 className="text-5xl font-bold">Find Your Dream Home</h1>
      <p className="mt-4 text-lg">Helping you find the perfect place to call home.</p>
      <button className="mt-6 px-6 py-3 bg-gray-500 rounded-full hover:bg-gray-600 text-white">
        Get Started
      </button>
    </section>
  );
}
