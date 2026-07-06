/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {},
  compiler: {
    styledComponents: true,
    // Strip console noise from production bundles (485+ call sites); keep signal.
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  images: {
    // Cloudflare Pages has no Next image optimizer; this loader routes remote
    // MLS photos through /api/proxy-image (CF resizing + cache) instead.
    loader: 'custom',
    loaderFile: './src/lib/imageLoader.js',
  },
  excludeDefaultMomentLocales: true,
  webpack: (config) => {
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
  eslint: {
    ignoreDuringBuilds: true
  },
  async rewrites() {
    return [
      { source: '/sitemap.xml', destination: '/api/sitemap' },
    ];
  },
};

export default nextConfig;
