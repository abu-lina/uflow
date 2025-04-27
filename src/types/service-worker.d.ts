declare module 'service-worker' {
  interface ExtendableEvent extends Event {
    waitUntil(fn: Promise<unknown>): void;
  }

  interface FetchEvent extends ExtendableEvent {
    request: Request;
    respondWith(response: Promise<Response> | Response): void;
  }

  interface ServiceWorkerGlobalScope extends EventTarget {
    clients: Clients;
    registration: ServiceWorkerRegistration;
    skipWaiting(): Promise<void>;
    addEventListener(
      type: 'install' | 'activate' | 'fetch' | 'push' | 'sync' | 'message',
      listener: (event: ExtendableEvent | FetchEvent) => void
    ): void;
  }

  interface Clients {
    claim(): Promise<void>;
    get(id: string): Promise<Client | undefined>;
    matchAll(options?: ClientMatchOptions): Promise<Client[]>;
  }

  interface Client {
    id: string;
    type: 'window' | 'worker' | 'sharedworker';
    url: string;
  }

  interface ClientMatchOptions {
    includeUncontrolled?: boolean;
    type?: 'window' | 'worker' | 'sharedworker';
  }
}

declare module 'next-pwa' {
  import { NextConfig } from 'next';

  interface RuntimeCachingEntry {
    urlPattern: RegExp | string;
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

interface ServiceWorkerGlobalScope {
  readonly clients: Clients;
  readonly registration: ServiceWorkerRegistration;
  skipWaiting(): Promise<void>;
}

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

export {};
