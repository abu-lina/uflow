/**
 * Rate Limiting Utility
 * 
 * Provides rate limiting for API routes using in-memory storage.
 * For production, consider using Redis-based rate limiting (@upstash/ratelimit).
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory rate limit stores
// Note: In production with multiple instances, use Redis
const rateLimitStores = new Map<string, Map<string, RateLimitEntry>>();

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (IP, user ID, etc.)
 * @param limit - Maximum number of requests
 * @param windowMs - Time window in milliseconds
 * @param storeKey - Key for the rate limit store (different endpoints can have different stores)
 * @returns true if request is allowed, false if rate limited
 */
export function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number,
  storeKey: string = 'default'
): boolean {
  const now = Date.now();
  
  // Get or create store for this endpoint
  let store = rateLimitStores.get(storeKey);
  if (!store) {
    store = new Map<string, RateLimitEntry>();
    rateLimitStores.set(storeKey, store);
  }

  const entry = store.get(identifier);

  // No entry or expired
  if (!entry || now > entry.resetTime) {
    store.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  // Check if limit exceeded
  if (entry.count >= limit) {
    return false;
  }

  // Increment count
  entry.count++;
  return true;
}

/**
 * Get remaining requests for an identifier
 * @param identifier - Unique identifier
 * @param limit - Maximum number of requests
 * @param windowMs - Time window in milliseconds
 * @param storeKey - Key for the rate limit store
 * @returns Number of remaining requests, or null if no entry
 */
export function getRemainingRequests(
  identifier: string,
  limit: number,
  windowMs: number,
  storeKey: string = 'default'
): number | null {
  const now = Date.now();
  const store = rateLimitStores.get(storeKey);
  if (!store) return null;

  const entry = store.get(identifier);
  if (!entry || now > entry.resetTime) {
    return limit;
  }

  return Math.max(0, limit - entry.count);
}

/**
 * Rate limiters for different endpoints
 */
export const rateLimiters = {
  /**
   * Push notification send endpoint
   * - 10 notifications per minute per user
   * - 100 notifications per hour per user
   */
  pushSend: {
    perMinute: (identifier: string) =>
      checkRateLimit(identifier, 10, 60 * 1000, 'push-send-minute'),
    perHour: (identifier: string) =>
      checkRateLimit(identifier, 100, 60 * 60 * 1000, 'push-send-hour'),
  },

  /**
   * Push notification subscribe endpoint
   * - 5 subscriptions per hour per user
   */
  pushSubscribe: {
    perHour: (identifier: string) =>
      checkRateLimit(identifier, 5, 60 * 60 * 1000, 'push-subscribe'),
  },

  /**
   * Offer creation endpoint
   * - 10 offers per minute per user
   * - 50 offers per hour per user
   */
  createOffer: {
    perMinute: (identifier: string) =>
      checkRateLimit(identifier, 10, 60 * 1000, 'create-offer-minute'),
    perHour: (identifier: string) =>
      checkRateLimit(identifier, 50, 60 * 60 * 1000, 'create-offer-hour'),
  },

  /**
   * Admin provider review endpoints
   * - 100 requests per hour per user (read operations)
   * - 20 reviews per hour per user (write operations)
   */
  adminProviders: {
    perHour: (identifier: string) =>
      checkRateLimit(identifier, 100, 60 * 60 * 1000, 'admin-providers-hour'),
  },
  adminReview: {
    perHour: (identifier: string) =>
      checkRateLimit(identifier, 20, 60 * 60 * 1000, 'admin-review-hour'),
    perMinute: (identifier: string) =>
      checkRateLimit(identifier, 5, 60 * 1000, 'admin-review-minute'),
  },
};

/**
 * Get client identifier from request
 * Prioritizes user ID if available, falls back to IP
 */
export function getClientIdentifier(
  request: Request,
  userId?: string
): string {
  if (userId) {
    return `user:${userId}`;
  }

  // Get IP from headers - prioritize Cloudflare, then x-forwarded-for, then x-real-ip
  const cfIp = request.headers.get('cf-connecting-ip');
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  // Use Cloudflare IP if available (most reliable)
  const ip = cfIp?.trim() || 
             (forwarded ? forwarded.split(',')[0].trim() : null) || 
             realIp?.trim() || 
             'unknown';
  
  // Ensure no spaces in identifier
  return `ip:${ip.replace(/\s+/g, '')}`;
}

