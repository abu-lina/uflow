/**
 * Centralized Configuration
 * 
 * This is the main configuration file that exports all application-wide settings.
 * It serves as the single source of truth for all configuration needs.
 * 
 * Structure:
 * - types/      - TypeScript interfaces and types
 * - constants/  - Application constants and enums
 * - security/   - Security-related configurations
 * - auth/       - Authentication settings
 * - pwa/        - Progressive Web App configurations
 * - environment - Environment variable validation
 * 
 * Usage:
 * ```typescript
 * import { config } from '@/config';
 * import { createNextConfig } from '@/config';
 * ```
 */

import { env } from './environment';
import { SECURITY_CONFIG } from './security';
import { createPWAConfig } from './pwa';
import type { NextConfigWithPWA } from './types';

// Re-export all configurations for easy access
export * from './types';
export * from './constants';
export * from './metadata';
export { SECURITY_CONFIG } from './security';
export { AUTH_CONFIG } from './auth';
export { createPWAConfig } from './pwa';
export { env, validateEnv } from './environment';

/**
 * Creates a Next.js configuration object with all necessary settings
 * including PWA support, security headers, and image domains.
 * 
 * @returns NextConfigWithPWA - The complete Next.js configuration
 */
export const createNextConfig = (): NextConfigWithPWA => ({
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  swcMinify: true,
  images: {
    domains: ['localhost', 'pmbatjlosstytdmmqkky.supabase.co'],
  },
  pwa: createPWAConfig(env.NODE_ENV),
  headers: SECURITY_CONFIG.headers,
});

/**
 * Current environment configuration
 * Provides quick access to environment-specific flags and settings
 */
export const config = {
  env: env.NODE_ENV,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
} as const; 