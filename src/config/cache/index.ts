import type { RuntimeCaching } from 'next-pwa';

interface CacheConfig {
  static: {
    maxEntries: number;
    maxAge: number;
  };
  api: {
    maxEntries: number;
    maxAge: number;
    timeout: number;
  };
  fonts: {
    maxEntries: number;
    maxAge: number;
  };
}

export const cacheConfig: CacheConfig = {
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
};

export const runtimeCaching: RuntimeCaching[] = [
  {
    // Cache static assets
    urlPattern: /^https:\/\/.*\.(png|jpg|jpeg|svg|gif|ico|css|js)$/,
    handler: 'CacheFirst',
    options: {
      cacheName: 'static-assets',
      expiration: {
        maxEntries: cacheConfig.static.maxEntries,
        maxAgeSeconds: cacheConfig.static.maxAge,
      },
    },
  },
  {
    // Cache Supabase API requests
    urlPattern: /^https:\/\/pmbatjlosstytdmmqkky\.supabase\.co\/.*/,
    handler: 'NetworkFirst',
    options: {
      cacheName: 'api-cache',
      expiration: {
        maxEntries: cacheConfig.api.maxEntries,
        maxAgeSeconds: cacheConfig.api.maxAge,
      },
      networkTimeoutSeconds: cacheConfig.api.timeout,
    },
  },
  {
    // Cache Google Fonts stylesheets
    urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'google-fonts-stylesheets',
    },
  },
  {
    // Cache Google Fonts webfont files
    urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/,
    handler: 'CacheFirst',
    options: {
      cacheName: 'google-fonts-webfonts',
      expiration: {
        maxEntries: cacheConfig.fonts.maxEntries,
        maxAgeSeconds: cacheConfig.fonts.maxAge,
      },
    },
  },
]; 