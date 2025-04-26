import type { Header } from 'next/dist/lib/load-custom-routes'

export const SECURITY_CONFIG = {
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
} as const

export const AUTH_CONFIG = {
  session: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
} as const 