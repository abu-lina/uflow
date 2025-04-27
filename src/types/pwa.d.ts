/**
 * @fileoverview Type definitions for Progressive Web App
 * @module types/pwa
 */

/// <reference lib="webworker" />

interface Clients {
  claim(): Promise<void>;
  matchAll(options?: ClientQueryOptions): Promise<Client[]>;
}

interface ClientQueryOptions {
  includeUncontrolled?: boolean;
  type?: 'window' | 'worker' | 'sharedworker' | 'all';
}

interface Client {
  readonly id: string;
  readonly type: ClientType;
  readonly url: string;
  postMessage(message: unknown, transfer?: Transferable[]): void;
}

type ClientType = 'window' | 'worker' | 'sharedworker';

declare global {
  interface Clients {
    claim(): Promise<void>;
    matchAll(options?: ClientQueryOptions): Promise<Client[]>;
  }

  interface ClientQueryOptions {
    includeUncontrolled?: boolean;
    type?: 'window' | 'worker' | 'sharedworker' | 'all';
  }

  interface Client {
    readonly id: string;
    readonly type: ClientType;
    readonly url: string;
    postMessage(message: unknown, transfer?: Transferable[]): void;
  }

  type ClientType = 'window' | 'worker' | 'sharedworker';
}

export {};

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

interface GenerateSWOptions {
  swDest?: string;
  clientsClaim?: boolean;
  skipWaiting?: boolean;
  runtimeCaching?: Array<{
    urlPattern: RegExp;
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
}

type GenerateSW = (options?: GenerateSWOptions) => void;

export { GenerateSW };

declare module 'workbox-webpack-plugin' {
  interface GenerateSWOptions {
    swDest?: string;
    clientsClaim?: boolean;
    skipWaiting?: boolean;
    runtimeCaching?: Array<{
      urlPattern: RegExp;
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
  }

  type GenerateSW = (options?: GenerateSWOptions) => void;

  export { GenerateSW };
}

interface WorkboxOptions {
  debug?: boolean;
  serviceWorkerPath?: string;
  scope?: string;
}

interface Workbox {
  register(): Promise<ServiceWorkerRegistration>;
  messageSW<T = unknown>(data: unknown): Promise<T>;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

type WorkboxConstructor = (scriptURL: string, options?: WorkboxOptions) => Workbox;

export { Workbox, WorkboxConstructor };

interface ServiceWorkerGlobalScope {
  readonly clients: Clients;
  readonly registration: ServiceWorkerRegistration;
  skipWaiting(): Promise<void>;
}

type ExtendableEvent = Event & {
  waitUntil(promise: Promise<void>): void;
};
