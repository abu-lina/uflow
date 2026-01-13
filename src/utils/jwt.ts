/**
 * Decode JWT token payload without verification
 * This is safe for checking expiration - we still verify with Supabase for security
 */
function decodeJWTPayload(token: string): { exp?: number; [key: string]: unknown } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode base64url encoded payload (second part)
    const payload = parts[1];
    // Replace URL-safe base64 characters
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    
    const decoded = Buffer.from(padded, 'base64').toString('utf-8');
    return JSON.parse(decoded) as { exp?: number; [key: string]: unknown };
  } catch {
    return null;
  }
}

/**
 * Check if JWT token is expired
 * Returns true if token is expired or invalid, false if still valid
 */
export function isJWTExpired(token: string): boolean {
  const payload = decodeJWTPayload(token);
  if (!payload || !payload.exp) {
    // If we can't decode or there's no exp claim, assume expired to be safe
    return true;
  }

  // exp is in seconds, Date.now() is in milliseconds
  const expirationTime = payload.exp * 1000;
  const now = Date.now();
  
  // Add 5 second buffer to account for clock skew
  return now >= (expirationTime - 5000);
}

/**
 * Check if JWT token is valid (not expired)
 * Returns true if token appears valid, false if expired or invalid
 */
export function isJWTValid(token: string): boolean {
  return !isJWTExpired(token);
}
