/**
 * Application Constants
 * 
 * Constants that should be used across the application.
 * These values should rarely change and are used for configuration
 * and application-wide settings.
 */

// Application Information
export const APP_INFO = {
  name: 'Ummah Flow',
  version: '1.0.0',
  description: 'A marketplace for the Muslim community',
} as const;

// Pagination
export const PAGINATION = {
  defaultPageSize: 10,
  maxPageSize: 100,
} as const;

// Cache
export const CACHE = {
  defaultTTL: 60 * 60, // 1 hour in seconds
  maxTTL: 24 * 60 * 60, // 24 hours in seconds
} as const;

// Validation
export const VALIDATION = {
  minPasswordLength: 8,
  maxPasswordLength: 128,
  minUsernameLength: 3,
  maxUsernameLength: 30,
} as const; 