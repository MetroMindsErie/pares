/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  experimental: {},
  compiler: {
    styledComponents: true,
  },
  images: {
    domains: ['cdnjs.cloudflare.com', 'tiles.stadiamaps.com', 'api-trestle.corelogic.com', 'via.placeholder.com'],
    unoptimized: true,
  },
  excludeDefaultMomentLocales: true,
  webpack: (config) => {
    config.cache = false;
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
