/**
 * Environment Configuration
 * 
 * Centralized environment variable access with validation and type safety.
 * This ensures all required environment variables are properly configured.
 */

/**
 * Validates that a required environment variable is set
 * @param key - Environment variable key
 * @param value - Environment variable value
 * @throws Error if value is missing or empty
 */
function validateEnvVar(key: string, value: string | undefined): string {
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
      'Please check your .env.local file and ensure the variable is set.'
    );
  }
  return value;
}

/**
 * Get VAPID public key for push notifications
 * @returns VAPID public key
 * @throws Error if not configured
 * 
 * @example
 * ```ts
 * try {
 *   const key = getVapidPublicKey();
 *   // Use key
 * } catch (error) {
 *   // Handle missing key
 * }
 * ```
 */
export function getVapidPublicKey(): string {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  return validateEnvVar('NEXT_PUBLIC_VAPID_PUBLIC_KEY', key);
}

/**
 * Get VAPID public key safely (returns null if not configured)
 * @returns VAPID public key or null
 */
export function getVapidPublicKeySafe(): string | null {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key || key.trim() === '') {
    return null;
  }
  return key;
}

/**
 * Check if VAPID is configured (non-throwing version)
 * @returns true if VAPID public key is configured
 */
export function isVapidConfigured(): boolean {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  return !!key && key.trim() !== '';
}

/**
 * Get optional environment variable
 * @param key - Environment variable key
 * @param defaultValue - Default value if not set
 * @returns Environment variable value or default
 */
export function getOptionalEnvVar(key: string, defaultValue: string = ''): string {
  return process.env[key] || defaultValue;
}

/**
 * Validate all required environment variables at startup
 * This should be called early in the application lifecycle
 */
export function validateEnvironment(): void {
  // Only validate in production or when explicitly requested
  if (process.env.NODE_ENV === 'production') {
    try {
      // Validate critical variables
      // Note: VAPID key is optional for development
      if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
        getVapidPublicKey();
      }
    } catch (error) {
      console.error('Environment validation failed:', error);
      // In production, you might want to throw here
      // For now, we'll just log the error
    }
  }
}

