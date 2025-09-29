const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
      },
    },
    {
      urlPattern: /^https:\/\/.*\.(?:js|css)$/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-resources',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
        },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Core Next.js settings
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  compress: true,

  // Cloudflare Pages optimization
  output: 'standalone',
  
  // Optimize file tracing for Cloudflare Pages
  experimental: {
    outputFileTracingIncludes: {
      '/': ['./src/**/*'],
    },
    optimizeCss: true,
    scrollRestoration: true,
    optimizePackageImports: ['@mui/material', '@mui/icons-material', 'framer-motion'],
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.public.blob.vercel-storage.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'api.iconify.design',
      },
      {
        protocol: 'https',
        hostname: 'api.unisvg.com',
      },
      {
        protocol: 'https',
        hostname: 'api.simplesvg.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy:
      "default-src 'self' https://api.iconify.design https://api.unisvg.com https://api.simplesvg.com https://*.supabase.co; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: https: blob:; connect-src 'self' https://api.iconify.design https://api.unisvg.com https://api.simplesvg.com https://*.supabase.co; frame-src 'self' https://api.iconify.design https://api.unisvg.com https://api.simplesvg.com;",
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },

  // Webpack optimization for Cloudflare Pages
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        maxSize: 244000, // 244KB max chunk size for Cloudflare Pages
        cacheGroups: {
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: -10,
            chunks: 'all',
            maxSize: 244000,
          },
        },
      };
    }
    return config;
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self' https://api.iconify.design https://api.unisvg.com https://api.simplesvg.com https://*.supabase.co; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: https: blob:; connect-src 'self' https://api.iconify.design https://api.unisvg.com https://api.simplesvg.com https://*.supabase.co; frame-src 'self' https://api.iconify.design https://api.unisvg.com https://api.simplesvg.com;",
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
    ];
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/old-path',
        destination: '/new-path',
        permanent: true,
      },
    ];
  },
};

module.exports = withPWA(nextConfig);