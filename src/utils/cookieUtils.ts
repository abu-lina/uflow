/**
 * Client-side cookie utilities
 * 
 * These utilities can be used in client components to set cookies
 * that will be readable by the server on subsequent requests.
 */

/**
 * Set a cookie with proper attributes
 * 
 * @param name - Cookie name
 * @param value - Cookie value
 * @param options - Cookie options (maxAge in days, path, etc.)
 */
export function setCookie(
  name: string,
  value: string,
  options: {
    maxAge?: number; // in days
    path?: string;
    sameSite?: 'strict' | 'lax' | 'none';
    secure?: boolean;
  } = {}
): void {
  if (typeof document === 'undefined') {
    return; // Server-side, skip
  }

  const {
    maxAge = 365, // Default: 1 year
    path = '/',
    sameSite = 'lax',
    secure = false, // Set to true in production with HTTPS
  } = options;

  // Calculate expiration date
  const expirationDate = new Date();
  expirationDate.setTime(expirationDate.getTime() + maxAge * 24 * 60 * 60 * 1000);

  // Build cookie string
  let cookieString = `${name}=${encodeURIComponent(value)}; path=${path}; expires=${expirationDate.toUTCString()}; SameSite=${sameSite}`;
  
  if (secure) {
    cookieString += '; Secure';
  }

  // Set the cookie
  document.cookie = cookieString;
}

/**
 * Get a cookie value by name
 * 
 * @param name - Cookie name
 * @returns Cookie value or null if not found
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null; // Server-side, return null
  }

  const nameEQ = name + '=';
  const cookies = document.cookie.split(';');

  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i];
    while (cookie.charAt(0) === ' ') {
      cookie = cookie.substring(1, cookie.length);
    }
    if (cookie.indexOf(nameEQ) === 0) {
      return decodeURIComponent(cookie.substring(nameEQ.length, cookie.length));
    }
  }

  return null;
}

/**
 * Delete a cookie
 * 
 * @param name - Cookie name
 * @param path - Cookie path (must match the path used when setting)
 */
export function deleteCookie(name: string, path: string = '/'): void {
  if (typeof document === 'undefined') {
    return; // Server-side, skip
  }

  // Set expiration date in the past to delete
  document.cookie = `${name}=; path=${path}; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax`;
}
