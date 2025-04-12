declare module 'next-pwa' {
  import { NextConfig } from 'next';
  
  interface RuntimeCachingEntry {
    urlPattern: RegExp | string;
    handler: string;
    options?: {
      cacheName?: string;
      expiration?: {
        maxEntries?: number;
        maxAgeSeconds?: number;
      };
      cacheableResponse?: {
        statuses: number[];
        headers?: Record<string, string>;
      };
      networkTimeoutSeconds?: number;
      backgroundSync?: {
        name: string;
        options?: {
          maxRetentionTime?: number;
        };
      };
      fetchOptions?: Record<string, string>;
      matchOptions?: Record<string, string>;
    };
  }
  
  interface PWAConfig {
    dest?: string;
    disable?: boolean;
    register?: boolean;
    scope?: string;
    sw?: string;
    skipWaiting?: boolean;
    runtimeCaching?: RuntimeCachingEntry[];
    publicExcludes?: string[];
    buildExcludes?: Array<string | RegExp>;
  }
  
  type WithPWA = (config?: PWAConfig) => (nextConfig: NextConfig) => NextConfig;
  
  const withPWA: WithPWA;
  
  export default withPWA;
} 