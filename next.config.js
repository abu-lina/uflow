const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

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

const isDev = process.env.NODE_ENV === 'development';

function buildCsp() {
  const directives = [
    "default-src 'self' https://api.iconify.design https://api.unisvg.com https://api.simplesvg.com https://*.supabase.co",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: https: blob:",
    [
      'connect-src',
      "'self'",
      'https://api.iconify.design',
      'https://api.unisvg.com',
      'https://api.simplesvg.com',
      'https://*.supabase.co',
      isDev ? 'http://localhost:*' : null,
      isDev ? 'http://127.0.0.1:*' : null,
      isDev ? 'ws://localhost:*' : null,
      isDev ? 'ws://127.0.0.1:*' : null,
    ]
      .filter(Boolean)
      .join(' '),
    "frame-src 'self' https://api.iconify.design https://api.unisvg.com https://api.simplesvg.com",
  ];

  return directives.join('; ') + ';';
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Core Next.js settings
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  // Docker/Standalone output for Hetzner deployment
  output: 'standalone',
  
  // Cloudflare Pages optimization - use standard output for SSR
  
  // Optimize file tracing for Cloudflare Pages
  outputFileTracingIncludes: {
    '/': ['./src/**/*'],
  },
  
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
    optimizePackageImports: ['@mui/material', '@mui/icons-material', 'framer-motion'],
    // Preload critical chunks
    webpackBuildWorker: true,
    // Enable faster builds
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
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
      // Instagram images
      {
        protocol: 'https',
        hostname: '**.cdninstagram.com',
      },
      {
        protocol: 'https',
        hostname: '**.fbcdn.net',
      },
      {
        protocol: 'https',
        hostname: 'scontent.cdninstagram.com',
      },
      // Google Places/Maps images
      {
        protocol: 'https',
        hostname: 'maps.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    // Configure image qualities to fix the warning
    qualities: [25, 50, 75, 95],
    contentSecurityPolicy: buildCsp(),
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },

  // Performance monitoring
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },

  // Webpack optimization for Cloudflare Pages
  webpack: (config, { isServer }) => {
    // Exclude Figma_imports from compilation
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/node_modules/**', '**/.next/**', '**/Figma_imports/**'],
    };
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        maxSize: 300000, // 300KB max chunk size (better balance)
        minSize: 20000, // 20KB min chunk size (fewer small chunks)
        cacheGroups: {
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
            maxSize: 300000,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: -10,
            chunks: 'all',
            maxSize: 300000,
            minSize: 10000,
          },
          // Split large libraries into separate chunks
          mui: {
            test: /[\\/]node_modules[\\/]@mui[\\/]/,
            name: 'mui',
            chunks: 'all',
            maxSize: 300000,
            priority: 10,
          },
          framer: {
            test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
            name: 'framer',
            chunks: 'all',
            maxSize: 300000,
            priority: 10,
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
          // Preload critical resources
          {
            key: 'Link',
            value: '</_next/static/css/app/layout.css>; rel=preload; as=style',
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
            value: buildCsp(),
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

module.exports = withBundleAnalyzer(withPWA(nextConfig));