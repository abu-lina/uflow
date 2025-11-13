/**
 * Security Utilities
 * 
 * Provides security functions for bot/hacker prevention:
 * - Disposable email detection
 * - IP blocking management
 * - Request timing analysis
 */

// Blocked disposable email domains
// In production, consider using a more comprehensive list or API service
const DISPOSABLE_EMAIL_DOMAINS = [
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'throwaway.email',
  'temp-mail.org',
  'getnada.com',
  'mohmal.com',
  'fakeinbox.com',
  'trashmail.com',
  'maildrop.cc',
  'yopmail.com',
  'sharklasers.com',
  'guerrillamailblock.com',
  'pokemail.net',
  'spam4.me',
  'bccto.me',
  'chammy.info',
  'devnullmail.com',
  'mailcatch.com',
  'meltmail.com',
  'mintemail.com',
  'mytrashmail.com',
  'tempail.com',
  'tempinbox.co.uk',
  'tempmail.net',
  'tempmailo.com',
  'tmail.ws',
  'tmpmail.org',
  'zoemail.org',
];

// Suspicious IPs tracking (in production, use Redis/database)
// Format: { ip: { count: number, blockedUntil: number, attempts: number[] } }
const suspiciousIPs = new Map<string, { 
  count: number; 
  blockedUntil: number;
  attempts: number[];
}>();

/**
 * Check if an email is from a disposable email service
 */
export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  return DISPOSABLE_EMAIL_DOMAINS.includes(domain);
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip'); // Cloudflare
  
  // Priority: Cloudflare > X-Forwarded-For > X-Real-IP
  if (cfConnectingIP) {
    return cfConnectingIP.trim();
  }
  
  if (forwarded) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP.trim();
  }
  
  return 'unknown';
}

/**
 * Check if an IP is currently blocked
 */
export function checkIPBlocked(ip: string): boolean {
  const entry = suspiciousIPs.get(ip);
  if (!entry) return false;
  
  if (Date.now() < entry.blockedUntil) {
    return true; // Still blocked
  }
  
  // Block expired, remove it
  suspiciousIPs.delete(ip);
  return false;
}

/**
 * Mark an IP as suspicious and optionally block it
 * @param ip - IP address to mark
 * @param hours - Hours to block (default: 24)
 */
export function markSuspiciousIP(ip: string, hours: number = 24): void {
  const now = Date.now();
  const existing = suspiciousIPs.get(ip);
  
  suspiciousIPs.set(ip, {
    count: (existing?.count || 0) + 1,
    blockedUntil: now + (hours * 60 * 60 * 1000),
    attempts: [...(existing?.attempts || []), now].slice(-10), // Keep last 10 attempts
  });
}

/**
 * Verify Cloudflare Turnstile CAPTCHA token
 */
export async function verifyTurnstileToken(
  token: string,
  ip: string
): Promise<{ success: boolean; error?: string }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  
  if (!secretKey) {
    // In development, allow requests without CAPTCHA if secret is not set
    if (process.env.NODE_ENV === 'development') {
      console.warn('[SECURITY] TURNSTILE_SECRET_KEY not set, skipping CAPTCHA verification in development');
      return { success: true };
    }
    return { success: false, error: 'CAPTCHA verification not configured' };
  }

  if (!token || token.trim() === '') {
    console.error('[SECURITY] Empty CAPTCHA token provided');
    return { success: false, error: 'CAPTCHA token is required' };
  }

  try {
    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: secretKey,
          response: token,
          remoteip: ip,
        }),
      }
    );

    if (!response.ok) {
      console.error('[SECURITY] CAPTCHA verification HTTP error:', response.status, response.statusText);
      return { success: false, error: `CAPTCHA verification failed: ${response.statusText}` };
    }

    const result = await response.json();
    
    if (!result.success) {
      const errors = result['error-codes'] || [];
      console.error('[SECURITY] CAPTCHA verification failed:', {
        errors,
        'error-codes': errors,
        'challenge_ts': result['challenge_ts'],
        'hostname': result['hostname'],
      });
      
      // Provide user-friendly error messages
      let errorMessage = 'CAPTCHA verification failed';
      if (errors.includes('invalid-input-response')) {
        errorMessage = 'Invalid CAPTCHA token. Please try again.';
      } else if (errors.includes('invalid-input-secret')) {
        errorMessage = 'CAPTCHA configuration error. Please contact support.';
      } else if (errors.includes('timeout-or-duplicate')) {
        errorMessage = 'CAPTCHA token expired. Please refresh and try again.';
      } else if (errors.includes('internal-error')) {
        errorMessage = 'CAPTCHA service error. Please try again later.';
      }
      
      return { 
        success: false, 
        error: errorMessage 
      };
    }

    console.log('[SECURITY] CAPTCHA verified successfully');
    return { success: true };
  } catch (error) {
    console.error('[SECURITY] Error verifying CAPTCHA:', error);
    return { success: false, error: 'Failed to verify CAPTCHA. Please check your connection.' };
  }
}

/**
 * Validate password complexity
 * Requirements:
 * - At least 8 characters
 * - Contains at least one letter
 * - Contains at least one number
 */
export function validatePasswordComplexity(password: string): { 
  valid: boolean; 
  error?: string 
} {
  if (password.length < 8) {
    return { 
      valid: false, 
      error: 'Password must be at least 8 characters long' 
    };
  }

  // Check for at least one letter
  if (!/[a-zA-Z]/.test(password)) {
    return { 
      valid: false, 
      error: 'Password must contain at least one letter' 
    };
  }

  // Check for at least one number
  if (!/\d/.test(password)) {
    return { 
      valid: false, 
      error: 'Password must contain at least one number' 
    };
  }

  return { valid: true };
}

/**
 * Analyze request timing to detect bots
 * Bots typically submit forms very quickly (< 100ms)
 * @param startTime - Request start timestamp
 * @returns true if request timing is suspicious
 */
export function isSuspiciousTiming(startTime: number): boolean {
  const requestTime = Date.now() - startTime;
  // Less than 100ms is suspicious (human can't fill form that fast)
  return requestTime < 100;
}

/**
 * Clean up expired IP blocks (call periodically)
 */
export function cleanupExpiredBlocks(): void {
  const now = Date.now();
  const ipsToDelete: string[] = [];
  
  // Collect IPs to delete (avoid modifying Map during iteration)
  suspiciousIPs.forEach((entry, ip) => {
    if (now >= entry.blockedUntil) {
      ipsToDelete.push(ip);
    }
  });
  
  // Delete expired entries
  ipsToDelete.forEach(ip => suspiciousIPs.delete(ip));
}

// Clean up expired blocks every hour
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredBlocks, 60 * 60 * 1000);
}

