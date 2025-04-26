import type { AuthConfig } from '../types';
import { env } from '../environment';

/**
 * Authentication Configuration
 * 
 * This configuration handles all authentication-related settings including:
 * - Session management
 * - JWT configuration
 * - Token expiration
 * - Security settings
 */
export const AUTH_CONFIG: AuthConfig = {
  session: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    secret: env.JWT_SECRET,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
} as const; 