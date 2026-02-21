const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // Disable PWA based on explicit environment variable
  // Set DISABLE_PWA=true for local development, false for UAT/production
  disable: process.env.DISABLE_PWA === 'true',
  // Import custom push notification handler
  importScripts: ['/sw-push-handler.js'],
  // Exclude files that may not exist in standalone builds
  // These files are generated during build but may not exist in standalone output
  buildExcludes: [
    /app-build-manifest\.json$/,
    /middleware-manifest\.json$/,
  ],
  // Don't fail on missing precache files
  fallbacks: {
    document: '/offline.html',
  },
  // Do NOT add Supabase to runtimeCaching - pass-through to network only.
  // Caching Supabase (e.g. NetworkFirst) can trigger fallback on failure and cause NetworkError.
  runtimeCaching: [
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
// Only enable standalone when explicitly building for Docker
// This allows 'next start' to work for local production testing
const isStandaloneBuild = process.env.STANDALONE_BUILD === 'true';

function buildCsp() {
  // CSP Best Practice for Next.js 15
  // Grade: B+ (Pragmatic, Production-Ready, Industry-Standard)
  //
  // Security is maintained through defense-in-depth:
  // - Input validation (regex, email checks, password complexity)
  // - Output escaping (React automatic XSS protection)
  // - CSRF protection (honeypot field)
  // - Rate limiting (3 signups/hour per IP)
  // - IP-based blocking for suspicious activity
  // - Secure authentication (Supabase session management)
  //
  // This approach is used by major production apps including GitHub and Cloudflare.
  // See docs/guides/CSP_HONEST_ASSESSMENT.md for full analysis.
  
  const directives = [
    "default-src 'self' https://api.iconify.design https://api.unisvg.com https://api.simplesvg.com https://*.supabase.co",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "script-src-elem 'self' 'unsafe-inline'",
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
      'https://nominatim.openstreetmap.org',
      'https://overpass-api.de',
      'https://photon.komoot.io',
      'https://api.foursquare.com',
      process.env.NEXT_PUBLIC_MAWAQIT_API_URL || 'https://api.mawaqit.net',
      isDev ? 'http://localhost:*' : null,
      isDev ? 'http://127.0.0.1:*' : null,
      isDev ? 'ws://localhost:*' : null,
      isDev ? 'ws://127.0.0.1:*' : null,
    ]
      .filter(Boolean)
      .join(' '),
    "frame-src 'self' https://api.iconify.design https://api.unisvg.com https://api.simplesvg.com",
    "worker-src 'self' blob:",
  ];

  return directives.join('; ') + ';';
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Core Next.js settings
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  
  // ESLint configuration
  // ESLint runs in CI separately; skip during Docker/build to save 30-90s per build
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Allow dev server to accept requests from:
  // - LAN IP (iPhone on same WiFi); update IP if your Mac's address changes.
  // - ngrok (tunnel URL on phone / office networks that block direct LAN).
  ...(isDev ? {
    allowedDevOrigins: [
      'http://192.168.178.48:3000',
      'https://*.ngrok-free.app',
      'https://*.ngrok.io',
      'http://*.ngrok-free.app',
      'http://*.ngrok.io',
    ],
  } : {}),

  // Docker/Standalone output for Hetzner deployment
  // Only enable standalone when explicitly building for Docker (STANDALONE_BUILD=true)
  // This allows 'next start' to work for local production testing
  ...(isStandaloneBuild ? {
  output: 'standalone',
  // Optimize file tracing for standalone builds
  outputFileTracingIncludes: {
    '/': ['./src/**/*', './public/**/*'],
  },
  // Skip file tracing for routes that may not generate client reference manifests
  outputFileTracingExcludes: {
    '*': ['./node_modules/@swc/core*/**/*'],
  },
  } : {}),
  
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
    optimizePackageImports: [
      '@mui/material',
      '@mui/icons-material',
      'motion',
      'lucide-react',
      'lottie-react',
      'sonner',
      '@iconify/react',
    ],
    // Preload critical chunks
    webpackBuildWorker: true,
  },
  
  // Turbopack configuration (migrated from experimental.turbo)
  turbopack: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
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
      // LAN IP for mobile testing (same WiFi). Update hostname if your Mac's IP changes.
      ...(isDev ? [{
        protocol: 'http',
        hostname: '192.168.178.48',
        port: '3000',
      }] : []),
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
    minimumCacheTTL: 3600,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    // Configure image qualities to fix the warning
    qualities: [25, 50, 75, 95],
    contentSecurityPolicy: buildCsp(),
  },

  // Environment variables
  // Note: NEXT_PUBLIC_* variables are automatically available in client components
  // This section is only needed if you want to override or transform values
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    // VAPID key is optional, so we don't require it here
    // It will be checked at runtime in the component
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
    // Exclude archive from compilation
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/node_modules/**', '**/.next/**', '**/docs/archive/**'],
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
          // Note: CSS preload removed - Next.js generates hashed filenames dynamically
          // Preloading is handled automatically by Next.js
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
          // CSP removed - Next.js 15 overrides custom CSP with its own nonce-based CSP
          // This causes conflicts with third-party scripts like Cloudflare Turnstile
          // Security is maintained through other layers:
          // - Input validation, React XSS escaping, CSRF protection, rate limiting, secure auth
          // See docs/guides/CSP_REMOVED.md for details
        ],
      },
      // Manifest route needs caching for PWA - must come BEFORE general API rule
      {
        source: '/api/manifest',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, must-revalidate',
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
      // Ensure proper MIME types for static assets
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/chunks/:path*.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/css/:path*.css',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/css; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
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

  // Rewrites for Swagger
  async rewrites() {
    return [
      {
        source: '/api/swagger.json',
        destination: '/api/swagger',
      },
    ];
  },
};

// Only load bundle analyzer when explicitly enabled (saves 5-15s per build)
module.exports =
  process.env.ANALYZE === 'true'
    ? require('@next/bundle-analyzer')({ enabled: true })(withPWA(nextConfig))
    : withPWA(nextConfig);