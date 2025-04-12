import type { NextConfig } from 'next';

interface SecurityConfig {
  headers: NextConfig['headers'];
  csp: {
    directives: Record<string, string[]>;
  };
}

export const securityConfig: SecurityConfig = {
  headers: [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
        },
      ],
    },
    {
      // Cache static assets for 1 year
      source: '/(.*).(jpg|jpeg|png|gif|ico|svg|webp|woff|woff2|ttf|otf)',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
  ],
  csp: {
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'img-src': [
        "'self'",
        'data:',
        'https:',
        'blob:',
        'https://pmbatjlosstytdmmqkky.supabase.co',
        'https://storage.googleapis.com',
        'https://drive.google.com',
        'https://maps.googleapis.com',
      ],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'connect-src': [
        "'self'",
        'https://pmbatjlosstytdmmqkky.supabase.co',
        'https://*.supabase.co',
        'wss://*.supabase.co',
      ],
      'frame-ancestors': ["'none'"],
      'form-action': ["'self'"],
      'base-uri': ["'self'"],
      'object-src': ["'none'"],
      'media-src': ["'self'"],
      'worker-src': ["'self'", 'blob:'],
      'manifest-src': ["'self'"],
      'upgrade-insecure-requests': [],
    },
  },
}; 