import type { NextConfig } from 'next';
import { runtimeCaching } from '../cache';
import { SECURITY_CONFIG } from '../security';
import { monitoringConfig } from '../monitoring';
import { resourceConfig } from '../resources';

interface PWAConfig {
  dest: string;
  disable: boolean;
  register: boolean;
  skipWaiting: boolean;
  buildExcludes: RegExp[];
  runtimeCaching: typeof runtimeCaching;
  events: boolean;
  scope: string;
  sw: string;
  customWorkerDir?: string;
  measurementId?: string;
  errorHandler?: {
    offline: string;
    404: string;
    500: string;
  };
  features: {
    offlineMode: boolean;
    pushNotifications: boolean;
    backgroundSync: boolean;
  };
  version: string;
  healthCheck: typeof monitoringConfig.healthCheck;
}

export const createPWAConfig = (_env: string): PWAConfig => ({
  dest: 'public',
  disable: _env === 'development',
  register: true,
  skipWaiting: true,
  buildExcludes: _env === 'development' ? [/app-build-manifest.json$/, /_buildManifest.js$/] : [],
  runtimeCaching,
  events: true,
  scope: '/',
  sw: '/sw.js',
  customWorkerDir: 'workers',
  measurementId: monitoringConfig.analytics.measurementId,
  errorHandler: {
    offline: '/offline',
    404: '/404',
    500: '/500',
  },
  features: {
    offlineMode: true,
    pushNotifications: _env === 'production',
    backgroundSync: _env === 'production',
  },
  version: process.env.APP_VERSION || '1.0.0',
  healthCheck: monitoringConfig.healthCheck,
});

// Export the base Next.js configuration
export const createNextConfig = (_env: string): NextConfig => ({
  ...resourceConfig,
  headers: SECURITY_CONFIG.headers,
  experimental: {
    ...resourceConfig.experimental,
    // Add any additional experimental features here
  },
  // Add any additional Next.js configuration here
});

export const manifest = {
  name: 'Ummah Flow',
  short_name: 'UFlow',
  description: 'A marketplace for Islamic products',
  start_url: '/',
  display: 'standalone',
  background_color: '#ffffff',
  theme_color: '#000000',
  icons: [
    {
      src: '/icons/icon-192x192.png',
      sizes: '192x192',
      type: 'image/png',
    },
    {
      src: '/icons/icon-512x512.png',
      sizes: '512x512',
      type: 'image/png',
    },
  ],
};

export const workboxConfig = {
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-stylesheets',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24 * 365,
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.gstatic\.com/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-webfonts',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24 * 365,
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
  ],
};

export const register = async () => {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js');
      console.log('ServiceWorker registration successful');
    } catch (error) {
      console.error('ServiceWorker registration failed:', error);
    }
  }
};
