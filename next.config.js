import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Exclude problematic pages from SSR
  experimental: {
    // This can be enabled if you want to debug SSR issues
    runtime: 'nodejs',
  },
  // Fix hydration issues by enabling more strict React behaviors
  compiler: {
    styledComponents: true,
  },
  images: {
    domains: ['cdnjs.cloudflare.com', 'tiles.stadiamaps.com', 'api-trestle.corelogic.com'],
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
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
    NEXT_PUBLIC_TRESTLE_TOKEN_URL: process.env.NEXT_PUBLIC_TRESTLE_TOKEN_URL,
    NEXT_PUBLIC_TRESTLE_CLIENT_ID: process.env.NEXT_PUBLIC_TRESTLE_CLIENT_ID,
    NEXT_PUBLIC_TRESTLE_CLIENT_SECRET: process.env.NEXT_PUBLIC_TRESTLE_CLIENT_SECRET,
  },
  eslint: {
    ignoreDuringBuilds: true
  }
};

// Change from module.exports to export default for ES modules
export default nextConfig;
