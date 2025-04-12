declare module 'next-pwa' {
  import { NextConfig } from 'next';
  
  type PWAConfig = {
    dest?: string;
    disable?: boolean;
    register?: boolean;
    scope?: string;
    sw?: string;
    skipWaiting?: boolean;
    runtimeCaching?: any[];
    publicExcludes?: string[];
    buildExcludes?: Array<string | RegExp> | ((path: string) => boolean) | null;
  };
  
  function withPWA(pwaConfig?: PWAConfig): (nextConfig: NextConfig) => NextConfig;
  
  export = withPWA;
} 