/** @type {import('next').NextConfig} */
const nextConfig = {experimental: {
    turbo: false,
  }, webpack: (config) => {
    config.resolve.modules.push(__dirname + '/node_modules');
    return config;
  }, env: {
    TRESTLE_TOKEN_URL: process.env.TRESTLE_TOKEN_URL,
    TRESTLE_CLIENT_ID: process.env.TRESTLE_CLIENT_ID,
    TRESTLE_CLIENT_SECRET: process.env.TRESTLE_CLIENT_SECRET,
  },};

export default nextConfig;
