/**
 * Push Notification Validation Schemas
 * 
 * Input validation for push notification endpoints
 */

/**
 * Validate notification title
 * - Must be 1-100 characters
 * - No HTML tags
 */
export function validateNotificationTitle(title: unknown): string {
  if (typeof title !== 'string') {
    throw new Error('Title must be a string');
  }

  const trimmed = title.trim();

  if (trimmed.length === 0) {
    throw new Error('Title cannot be empty');
  }

  if (trimmed.length > 100) {
    throw new Error('Title must be 100 characters or less');
  }

  // Check for HTML tags (basic XSS prevention)
  if (/<[^>]*>/g.test(trimmed)) {
    throw new Error('Title cannot contain HTML tags');
  }

  return trimmed;
}

/**
 * Validate notification body
 * - Must be 1-500 characters
 * - No HTML tags
 */
export function validateNotificationBody(body: unknown): string {
  if (typeof body !== 'string') {
    throw new Error('Body must be a string');
  }

  const trimmed = body.trim();

  if (trimmed.length === 0) {
    throw new Error('Body cannot be empty');
  }

  if (trimmed.length > 500) {
    throw new Error('Body must be 500 characters or less');
  }

  // Check for HTML tags (basic XSS prevention)
  if (/<[^>]*>/g.test(trimmed)) {
    throw new Error('Body cannot contain HTML tags');
  }

  return trimmed;
}

/**
 * Validate user IDs
 * - Must be UUIDs
 * - Can be single string or array
 * - Array must have at least 1 item
 * - Maximum 1000 users per request
 */
export function validateUserIds(userIds: unknown): string[] {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (typeof userIds === 'string') {
    if (!uuidRegex.test(userIds)) {
      throw new Error('Invalid user ID format');
    }
    return [userIds];
  }

  if (Array.isArray(userIds)) {
    if (userIds.length === 0) {
      throw new Error('At least one user ID is required');
    }

    if (userIds.length > 1000) {
      throw new Error('Maximum 1000 users per request');
    }

    const invalidIds = userIds.filter((id) => typeof id !== 'string' || !uuidRegex.test(id));
    if (invalidIds.length > 0) {
      throw new Error(`Invalid user ID format: ${invalidIds[0]}`);
    }

    return userIds;
  }

  throw new Error('User IDs must be a string or array of strings');
}

/**
 * Validate notification URL
 * - Must be relative path or valid URL
 * - No javascript: or data: protocols
 */
export function validateNotificationUrl(url: unknown): string | undefined {
  if (url === undefined || url === null) {
    return undefined;
  }

  if (typeof url !== 'string') {
    throw new Error('URL must be a string');
  }

  const trimmed = url.trim();

  if (trimmed.length === 0) {
    return undefined;
  }

  // Allow relative paths
  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  // Validate absolute URLs
  try {
    const parsed = new URL(trimmed);
    
    // Block dangerous protocols
    if (parsed.protocol === 'javascript:' || parsed.protocol === 'data:') {
      throw new Error('Invalid URL protocol');
    }

    // Only allow http/https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('URL must use http or https protocol');
    }

    return trimmed;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Invalid URL format');
    }
    throw error;
  }
}

/**
 * Validate notification tag
 * - Must be 1-50 characters
 * - Alphanumeric, hyphens, underscores only
 */
export function validateNotificationTag(tag: unknown): string | undefined {
  if (tag === undefined || tag === null) {
    return undefined;
  }

  if (typeof tag !== 'string') {
    throw new Error('Tag must be a string');
  }

  const trimmed = tag.trim();

  if (trimmed.length === 0) {
    return undefined;
  }

  if (trimmed.length > 50) {
    throw new Error('Tag must be 50 characters or less');
  }

  // Alphanumeric, hyphens, underscores only
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    throw new Error('Tag can only contain letters, numbers, hyphens, and underscores');
  }

  return trimmed;
}

/**
 * Validate notification icon/badge/image URLs
 * - Must be relative paths or valid URLs
 */
export function validateNotificationImageUrl(url: unknown): string | undefined {
  if (url === undefined || url === null) {
    return undefined;
  }

  if (typeof url !== 'string') {
    throw new Error('Image URL must be a string');
  }

  const trimmed = url.trim();

  if (trimmed.length === 0) {
    return undefined;
  }

  // Allow relative paths
  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  // Validate absolute URLs
  try {
    const parsed = new URL(trimmed);
    
    // Block dangerous protocols
    if (parsed.protocol === 'javascript:' || parsed.protocol === 'data:') {
      throw new Error('Invalid URL protocol');
    }

    // Only allow http/https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Image URL must use http or https protocol');
    }

    return trimmed;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Invalid URL format');
    }
    throw error;
  }
}

