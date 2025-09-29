import withPWA from 'next-pwa';

/**
 * Next.js Configuration
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  // Core Next.js settings
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  compress: true,

  // Image optimization with remote patterns (more secure than domains)
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

  // Environment variables (only expose what's needed)
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },

  // Webpack configuration for Cloudflare Pages optimization
  webpack: (config, { isServer }) => {
    // Optimize for Cloudflare Pages file size limits
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
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
          },
        },
      };
    }
    return config;
  },

  // Experimental features (enable only what you need)
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
    // Optimize for Cloudflare Pages
    optimizePackageImports: ['@mui/material', '@mui/icons-material', 'framer-motion'],
  },

  // Security headers (comprehensive set)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Security headers
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
          // Performance headers
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          // Allow necessary resources
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self' https://api.iconify.design https://api.unisvg.com https://api.simplesvg.com https://*.supabase.co; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: https: blob:; connect-src 'self' https://api.iconify.design https://api.unisvg.com https://api.simplesvg.com https://*.supabase.co; frame-src 'self' https://api.iconify.design https://api.unisvg.com https://api.simplesvg.com;",
          },
          // Allow CORS for local development
          {
            key: 'Access-Control-Allow-Origin',
            value:
              process.env.NODE_ENV === 'development' ? '*' : 'https://your-production-domain.com',
          },
          // Additional headers for Iconify
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'cross-origin',
          },
        ],
      },
      // API routes specific headers
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

  // Redirects and rewrites (example structure)
  async redirects() {
    return [
      {
        source: '/old-path',
        destination: '/new-path',
        permanent: true,
      },
    ];
  },

  // Internationalization (if needed)
  i18n: {
    locales: ['en'],
    defaultLocale: 'en',
  },
};

// Enable PWA in production only
export default withPWA({
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
})(nextConfig);
