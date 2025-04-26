import type { NextConfig } from 'next';
import type { Header } from 'next/dist/lib/load-custom-routes';

// Types
interface RuntimeCaching {
  urlPattern: RegExp;
  handler: string;
  options: {
    cacheName: string;
    expiration?: {
      maxEntries: number;
      maxAgeSeconds: number;
    };
    networkTimeoutSeconds?: number;
  };
}

// Infrastructure Configuration
export const INFRA_CONFIG = {
  cache: {
    // Static assets (leveraging Vercel's CDN)
    static: {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      staleWhileRevalidate: 24 * 60 * 60, // 24 hours
    },
    // API responses (runtime caching)
    api: {
      maxAge: 5 * 60, // 5 minutes
      staleWhileRevalidate: 60, // 1 minute
    },
    // Images (leveraging Vercel's Image Optimization)
    images: {
      maxAge: 7 * 24 * 60 * 60, // 7 days
      staleWhileRevalidate: 24 * 60 * 60, // 24 hours
    },
    // Runtime caching rules
    runtime: [
      {
        urlPattern: /^https:\/\/pmbatjlosstytdmmqkky\.supabase\.co\/storage\/v1\/object\/public\/.*/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'supabase-images',
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
          },
          networkTimeoutSeconds: 10,
        },
      },
      {
        urlPattern: /^https:\/\/pmbatjlosstytdmmqkky\.supabase\.co\/rest\/v1\/.*/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'supabase-api',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 5 * 60, // 5 minutes
          },
          networkTimeoutSeconds: 5,
        },
      },
    ] as RuntimeCaching[],
  } as const,
  
  security: {
    headers: async (): Promise<Header[]> => [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-eval' 'unsafe-inline' *.google-analytics.com;
              style-src 'self' 'unsafe-inline' *.googleapis.com;
              img-src 'self' blob: data: *.googleapis.com *.supabase.co;
              font-src 'self' fonts.gstatic.com;
              connect-src 'self' *.supabase.co;
            `.replace(/\s+/g, ' ').trim(),
          },
        ],
      },
    ],
  } as const,

  resources: {
    images: {
      domains: ['pmbatjlosstytdmmqkky.supabase.co'] as string[],
      deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840] as number[],
      imageSizes: [16, 32, 48, 64, 96, 128, 256, 384] as number[],
    },
    experimental: {
      optimizeCss: true,
      scrollRestoration: true,
      // Enable Vercel's Image Optimization
      images: {
        allowFutureImage: true,
        remotePatterns: [
          {
            protocol: 'https',
            hostname: 'pmbatjlosstytdmmqkky.supabase.co',
            pathname: '/storage/v1/object/public/**',
          },
        ],
      },
    },
  } as const,
} as const;

// Next.js Configuration
export const createNextConfig = (env: string): NextConfig => ({
  ...INFRA_CONFIG.resources,
  headers: INFRA_CONFIG.security.headers,
  experimental: {
    ...INFRA_CONFIG.resources.experimental,
  },
  // Enable static optimization for better performance
  output: 'standalone',
  // Configure build-time caching
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000, // 1 hour
    pagesBufferLength: 5,
  },
  // Environment-specific configuration
  ...(env === 'production' ? {
    // Production-specific optimizations
    compress: true,
    poweredByHeader: false,
    reactStrictMode: true,
    swcMinify: true,
  } : {
    // Development-specific settings
    reactStrictMode: true,
    swcMinify: false,
  }),
}); 