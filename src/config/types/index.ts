import type { NextConfig } from 'next';
import type { Header } from 'next/dist/lib/load-custom-routes';

export interface CacheConfig {
  maxEntries: number;
  maxAge: number;
  timeout?: number;
}

export interface RuntimeCaching {
  urlPattern: RegExp;
  handler: string;
  options: {
    expiration?: {
      maxEntries: number;
      maxAgeSeconds: number;
    };
    networkTimeoutSeconds?: number;
  };
}

export interface AuthMetadataOptions {
  title?: string;
  description?: string;
  keywords?: string[];
}

export interface SecurityConfig {
  headers: () => Promise<Header[]>;
}

export interface AuthConfig {
  session: {
    maxAge: number;
    updateAge: number;
  };
  jwt: {
    secret?: string;
    maxAge: number;
  };
}

export interface PWAConfig {
  dest: string;
  register: boolean;
  skipWaiting: boolean;
  disable: boolean;
  runtimeCaching: RuntimeCaching[];
}

export interface NextConfigWithPWA extends NextConfig {
  pwa?: PWAConfig;
} 