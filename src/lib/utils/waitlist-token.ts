/**
 * Generate a secure random token for waitlist entries
 * Used to authenticate waitlist updates without requiring user authentication
 */
export function generateWaitlistToken(): string {
  // Generate a cryptographically secure random token
  // 32 bytes = 256 bits = 64 hex characters
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    // Modern browsers and Node.js 18+
    return crypto.randomUUID();
  }
  
  // Fallback for older environments
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
