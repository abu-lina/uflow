import type { NextConfig } from 'next';
import type { Header } from 'next/dist/lib/load-custom-routes';

// Types
interface CacheConfig {
  maxEntries: number;
  maxAge: number;
  timeout?: number;
}

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
    static: {
      maxEntries: 200,
      maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    api: {
      maxEntries: 50,
      maxAge: 24 * 60 * 60, // 24 hours
      timeout: 10,
    },
    fonts: {
      maxEntries: 30,
      maxAge: 365 * 24 * 60 * 60, // 1 year
    },
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
              img-src 'self' blob: data: *.googleapis.com;
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
    },
    experimental: {
      optimizeCss: true,
      scrollRestoration: true,
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
}); 