/**
 * useRateLimit
 * 
 * Client-side rate limiting hook for preventing spam actions.
 * Uses localStorage to persist rate limit state across page reloads.
 * 
 * Note: This is client-side only and can be bypassed. For critical operations,
 * implement server-side rate limiting in API routes.
 * 
 * @param key - Unique identifier for the rate limit (e.g., 'create-offer')
 * @param limit - Maximum number of actions allowed
 * @param windowMs - Time window in milliseconds
 * @returns Object with isAllowed, remaining, and resetTime
 * 
 * @example
 * ```tsx
 * const { isAllowed, remaining, resetTime } = useRateLimit(
 *   `create-offer-${user.id}`,
 *   10, // 10 offers
 *   60 * 1000 // per minute
 * );
 * 
 * if (!isAllowed) {
 *   toast.error(`Rate limit exceeded. Try again in ${Math.ceil((resetTime - Date.now()) / 1000)}s`);
 *   return;
 * }
 * ```
 */

import { useState, useEffect, useCallback } from 'react';

interface RateLimitState {
  count: number;
  resetTime: number;
}

interface UseRateLimitReturn {
  isAllowed: boolean;
  remaining: number;
  resetTime: number | null;
  checkLimit: () => boolean;
}

export function useRateLimit(
  key: string,
  limit: number,
  windowMs: number
): UseRateLimitReturn {
  const [state, setState] = useState<RateLimitState | null>(null);

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`rate-limit-${key}`);
      if (stored) {
        const parsed = JSON.parse(stored) as RateLimitState;
        const now = Date.now();
        
        // If expired, reset
        if (now > parsed.resetTime) {
          localStorage.removeItem(`rate-limit-${key}`);
          setState(null);
        } else {
          setState(parsed);
        }
      }
    } catch (error) {
      // If localStorage fails, just continue without rate limiting
      console.warn('Failed to load rate limit state:', error);
    }
  }, [key]);

  // Check if action is allowed
  const checkLimit = useCallback((): boolean => {
    const now = Date.now();
    
    // No state or expired - allow and create new entry
    if (!state || now > state.resetTime) {
      const newState: RateLimitState = {
        count: 1,
        resetTime: now + windowMs,
      };
      
      try {
        localStorage.setItem(`rate-limit-${key}`, JSON.stringify(newState));
      } catch (error) {
        // If localStorage fails, allow the action
        console.warn('Failed to save rate limit state:', error);
      }
      
      setState(newState);
      return true;
    }

    // Check if limit exceeded
    if (state.count >= limit) {
      return false;
    }

    // Increment count
    const updatedState: RateLimitState = {
      count: state.count + 1,
      resetTime: state.resetTime,
    };
    
    try {
      localStorage.setItem(`rate-limit-${key}`, JSON.stringify(updatedState));
    } catch (error) {
      console.warn('Failed to update rate limit state:', error);
    }
    
    setState(updatedState);
    return true;
  }, [key, limit, windowMs, state]);

  const now = Date.now();
  const isAllowed = state ? (now <= state.resetTime && state.count < limit) : true;
  const remaining = state ? Math.max(0, limit - state.count) : limit;
  const resetTime = state && now <= state.resetTime ? state.resetTime : null;

  return {
    isAllowed,
    remaining,
    resetTime,
    checkLimit,
  };
}

