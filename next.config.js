/** @type {import('next').NextConfig} */
import path from 'path';

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    turbo: false,
  },
  images: {
    domains: ['cdnjs.cloudflare.com', 'tiles.stadiamaps.com', 'api-trestle.corelogic.com']
  },
  webpack: (config) => {
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    config.resolve.modules.push(path.join(__dirname, 'node_modules'));
    // Disable persistent caching to avoid large buffer allocations
    config.cache = false;
    // Replace url-loader rule with asset module configuration:
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
    TRESTLE_TOKEN_URL: process.env.TRESTLE_TOKEN_URL,
    TRESTLE_CLIENT_ID: process.env.TRESTLE_CLIENT_ID,
    TRESTLE_CLIENT_SECRET: process.env.TRESTLE_CLIENT_SECRET,
  },
};

export default nextConfig;
