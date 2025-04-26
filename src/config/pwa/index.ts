import type { NextConfig } from 'next';
import { cacheConfig, runtimeCaching } from '../cache';
import { securityConfig } from '../security';
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

export const createPWAConfig = (env: string): PWAConfig => ({
  dest: 'public',
  disable: env === 'development',
  register: true,
  skipWaiting: true,
  buildExcludes: env === 'development' ? [/app-build-manifest.json$/, /_buildManifest.js$/] : [],
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
    pushNotifications: env === 'production',
    backgroundSync: env === 'production',
  },
  version: process.env.APP_VERSION || '1.0.0',
  healthCheck: monitoringConfig.healthCheck,
});

// Export the base Next.js configuration
export const createNextConfig = (env: string): NextConfig => ({
  ...resourceConfig,
  headers: securityConfig.headers,
  experimental: {
    ...resourceConfig.experimental,
    // Add any additional experimental features here
  },
  // Add any additional Next.js configuration here
}); 