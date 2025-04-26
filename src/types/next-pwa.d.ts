/**
 * @fileoverview Type definitions for next-pwa
 * @module types/next-pwa
 */

declare module 'next-pwa' {
  import { NextConfig } from 'next';
  
  /**
   * Configuration options for next-pwa
   */
  type PWAConfig = {
    /** The directory to store the generated service worker and related files */
    dest?: string;
    /** Disable PWA features */
    disable?: boolean;
    /** Whether to register the service worker */
    register?: boolean;
    /** The scope of the service worker */
    scope?: string;
    /** The path to the service worker file */
    sw?: string;
    /** Whether to skip waiting for the service worker to activate */
    skipWaiting?: boolean;
    /** Custom runtime caching rules */
    runtimeCaching?: Array<{
      urlPattern: string | RegExp;
      handler: 'NetworkFirst' | 'CacheFirst' | 'NetworkOnly' | 'CacheOnly' | 'StaleWhileRevalidate';
      options?: {
        cacheName?: string;
        expiration?: {
          maxEntries?: number;
          maxAgeSeconds?: number;
        };
        networkTimeoutSeconds?: number;
        matchOptions?: {
          ignoreSearch?: boolean;
          ignoreMethod?: boolean;
          ignoreVary?: boolean;
        };
      };
    }>;
    /** Files to exclude from the public directory */
    publicExcludes?: string[];
    /** Files to exclude from the build */
    buildExcludes?: Array<string | RegExp> | ((path: string) => boolean) | null;
  };
  
  /**
   * Creates a Next.js configuration with PWA support
   * @param pwaConfig - Configuration options for next-pwa
   * @returns A function that takes a Next.js config and returns an enhanced config
   */
  function withPWA(pwaConfig?: PWAConfig): (nextConfig: NextConfig) => NextConfig;
  
  export = withPWA;
} 