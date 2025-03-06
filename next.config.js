import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Removed the dir setting as it's causing issues
  // Let Next.js use the default pages directory structure
  
  webpack: (config) => {
    // Add paths for module resolution
    config.resolve.modules.push(path.resolve(__dirname, './src'));
    config.resolve.modules.push(path.resolve(__dirname, './node_modules'));
    
    return config;
  },
  
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  
  // Other configurations
  swcMinify: true,
  images: {
    domains: ['cdnjs.cloudflare.com', 'tiles.stadiamaps.com', 'api-trestle.corelogic.com']
  },
  env: {
    TRESTLE_TOKEN_URL: process.env.TRESTLE_TOKEN_URL,
    TRESTLE_CLIENT_ID: process.env.TRESTLE_CLIENT_ID,
    TRESTLE_CLIENT_SECRET: process.env.TRESTLE_CLIENT_SECRET,
  }
};

export default nextConfig;
