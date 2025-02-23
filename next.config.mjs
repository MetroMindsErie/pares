/** @type {import('next').NextConfig} */
import path from 'path';

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    turbo: false,
  },
  images: {
    domains: ['api-trestle.corelogic.com'], // Allow external image domain
  },
  webpack: (config) => {
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    config.resolve.modules.push(path.join(__dirname, 'node_modules'));
    return config;
  },
  env: {
    TRESTLE_TOKEN_URL: process.env.TRESTLE_TOKEN_URL,
    TRESTLE_CLIENT_ID: process.env.TRESTLE_CLIENT_ID,
    TRESTLE_CLIENT_SECRET: process.env.TRESTLE_CLIENT_SECRET,
  },
};

export default nextConfig;
