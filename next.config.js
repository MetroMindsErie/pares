import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Explicitly mark pages that shouldn't be statically generated
  unstable_excludeFiles: [
    'pages/reels/refresh.js',
    'pages/reels/fetch.js',
    'pages/users/create.js',
    'pages/auth/store-facebook-token.js',
    'pages/auth/facebook-token.js',
    'pages/token.js',
  ],
  // Add trailing slashes to URLs
  trailingSlash: true,
  // Add paths for module resolution
  webpack: (config, { isServer }) => {
    // Add your webpack configurations here
    return config;
  },
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  images: {
    domains: ['cdnjs.cloudflare.com', 'tiles.stadiamaps.com', 'api-trestle.corelogic.com'],
    unoptimized: true,
  },
  env: {
    TRESTLE_TOKEN_URL: process.env.TRESTLE_TOKEN_URL,
    TRESTLE_CLIENT_ID: process.env.TRESTLE_CLIENT_ID,
    TRESTLE_CLIENT_SECRET: process.env.TRESTLE_CLIENT_SECRET,
  }
};

// Change from module.exports to export default for ES modules
export default nextConfig;
