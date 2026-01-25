/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // Clean up experimental section
  experimental: {},
  // Fix hydration issues by enabling more strict React behaviors
  compiler: {
    styledComponents: true,
  },
  images: {
    domains: ['cdnjs.cloudflare.com', 'tiles.stadiamaps.com', 'api-trestle.corelogic.com', 'via.placeholder.com'], // Add placeholder domain
    unoptimized: true,
  },
  // NextJS 15+ configuration to prevent prerendering issue
  output: 'standalone',  // More stable build output for Netlify
  
  // Tell Next.js not to attempt to render these paths at build time
  excludeDefaultMomentLocales: true, // Reduce bundle size
  webpack: (config) => {
    // Disable persistent caching to avoid large buffer allocations
    config.cache = false;
    // Asset handling
    config.module.rules.push({
      test: /\.(png|jpg|jpeg|gif|svg)$/i,
      type: 'asset',
      parser: {
        dataUrlCondition: {
          maxSize: 8192,
        },
      },
      generator: {
        publicPath: '/_next/static/images',
        outputPath: 'static/images/',
      },
    });
    return config;
  },
  env: {
    NEXT_PUBLIC_TRESTLE_TOKEN_URL: process.env.NEXT_PUBLIC_TRESTLE_TOKEN_URL,
    NEXT_PUBLIC_TRESTLE_CLIENT_ID: process.env.NEXT_PUBLIC_TRESTLE_CLIENT_ID,
    NEXT_PUBLIC_TRESTLE_CLIENT_SECRET: process.env.NEXT_PUBLIC_TRESTLE_CLIENT_SECRET,
    IS_NETLIFY: 'true', // Signal that we're building for Netlify
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  // Fix missing fallback images with a redirect
  async redirects() {
    return [
      {
        source: '/fallback-property.jpg',
        destination: 'https://via.placeholder.com/800x600?text=Property+Image+Not+Available',
        permanent: true,
      },
      {
        source: '/properties.jpg', 
        destination: 'https://via.placeholder.com/800x600?text=Property+Image+Not+Available',
        permanent: true,
      },
      {
        source: '/default-agent.jpg',
        destination: 'https://via.placeholder.com/200x200?text=Agent',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
