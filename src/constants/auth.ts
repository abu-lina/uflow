/**
 * Authentication Constants
 * 
 * Constants related to authentication configuration, such as
 * token expiration times, cookie names, and other auth-related properties.
 */

// Token Configuration
export const TOKEN_CONFIG = {
  accessTokenExpiry: 15 * 60 * 1000, // 15 minutes
  refreshTokenExpiry: 7 * 24 * 60 * 60 * 1000, // 7 days
  cookieName: 'auth-token',
  refreshCookieName: 'refresh-token',
} as const;

// Cookie Configuration
export const COOKIE_CONFIG = {
  path: '/',
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  httpOnly: true,
} as const;

// Session Configuration
export const SESSION_CONFIG = {
  maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  updateAge: 24 * 60 * 60, // 24 hours in seconds
} as const;

// Password Configuration
export const PASSWORD_CONFIG = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
} as const; 