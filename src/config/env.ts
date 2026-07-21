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

