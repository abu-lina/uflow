import type { NextConfig } from 'next';

interface ResourceConfig {
  images: NextConfig['images'];
  experimental: NextConfig['experimental'];
  compress: boolean;
  poweredByHeader: boolean;
}

export const resourceConfig: ResourceConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'drive.google.com',
      },
      {
        protocol: 'https',
        hostname: 'maps.googleapis.com',
      },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  experimental: {
    optimizeCss: true,
    optimizeImages: true,
    scrollRestoration: true,
    serverActions: true,
    serverComponentsExternalPackages: ['sharp'],
  },
  compress: true,
  poweredByHeader: false,
};

// Resource types for type safety
export const ResourceTypes = {
  IMAGE: 'image',
  FONT: 'font',
  SCRIPT: 'script',
  STYLE: 'style',
  DOCUMENT: 'document',
} as const;

// Resource priorities for loading
export const ResourcePriorities = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

// Resource loading strategies
export const ResourceStrategies = {
  EAGER: 'eager',
  LAZY: 'lazy',
  PRELOAD: 'preload',
} as const; 