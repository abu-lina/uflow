/**
 * Input Sanitization Utilities
 * 
 * Prevents XSS attacks by sanitizing user input before database insertion.
 * Uses a lightweight approach suitable for text fields (offers, needs, etc.)
 * 
 * For production, consider using DOMPurify for more comprehensive sanitization.
 */

/**
 * Sanitize text input for database storage
 * 
 * Removes:
 * - HTML tags
 * - Script tags
 * - Event handlers (onclick, onerror, etc.)
 * - JavaScript: and data: URLs
 * 
 * @param input - Raw user input
 * @returns Sanitized string safe for database storage
 * 
 * @example
 * ```tsx
 * const sanitized = sanitizeTextInput(userInput);
 * await supabase.from('offers').insert({ name_de: sanitized });
 * ```
 */
export function sanitizeTextInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  let sanitized = input.trim();

  // Remove HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Remove script tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');

  // Remove javascript: and data: URLs
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/data:[^;]*;base64,/gi, '');

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  return sanitized;
}

/**
 * Validate and sanitize offer/need name
 * 
 * Combines validation and sanitization in one step
 * 
 * @param input - Raw user input
 * @param maxLength - Maximum allowed length (default: 100)
 * @returns Sanitized string or empty string if invalid
 */
export function validateAndSanitizeName(input: string, maxLength: number = 100): string {
  const sanitized = sanitizeTextInput(input);

  // Length validation
  if (sanitized.length === 0) {
    return '';
  }

  if (sanitized.length > maxLength) {
    return sanitized.substring(0, maxLength).trim();
  }

  return sanitized;
}

