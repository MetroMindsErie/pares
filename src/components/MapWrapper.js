'use client';
import dynamic from 'next/dynamic';

const PropertyMap = dynamic(() => import('./PropertyMap'), { ssr: false });

const MapWrapper = ({ listings }) => {
  if (typeof window === 'undefined') return null; // Prevent server-side rendering
  return <PropertyMap listings={listings} />;
};

export default MapWrapper;