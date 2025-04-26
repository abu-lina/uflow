/**
 * @fileoverview Validation utilities for common data types
 * @module utils/validation
 */

export * from './schemas';

/**
 * Validates and parses a page parameter
 * @param value - Page value to validate
 * @param defaultValue - Default value if validation fails
 * @returns Validated page number
 */
export function validatePage(value: string | null | undefined, defaultValue = 1): number {
  const parsed = parseInt(value || String(defaultValue));
  return isNaN(parsed) || parsed < 1 ? defaultValue : parsed;
}

/**
 * Validates and parses a pageSize parameter with min/max constraints
 * @param value - Page size value to validate
 * @param defaultValue - Default value if validation fails
 * @param minValue - Minimum allowed value
 * @param maxValue - Maximum allowed value
 * @returns Validated page size
 */
export function validatePageSize(
  value: string | null | undefined, 
  defaultValue = 10,
  minValue = 1,
  maxValue = 50
): number {
  const parsed = parseInt(value || String(defaultValue));
  if (isNaN(parsed) || parsed < minValue) return defaultValue;
  return Math.min(parsed, maxValue);
}

/**
 * Validates a string parameter
 * @param value - String value to validate
 * @param defaultValue - Default value if validation fails
 * @param maxLength - Maximum allowed length
 * @returns Validated string
 */
export function validateString(
  value: string | null | undefined,
  defaultValue = '',
  maxLength = 100
): string {
  if (!value) return defaultValue;
  return value.slice(0, maxLength).trim();
}

/**
 * Validates a category parameter
 * @param value - Category value to validate
 * @param validCategories - Array of valid categories
 * @param defaultValue - Default value if validation fails
 * @returns Validated category
 */
export function validateCategory(
  value: string | null | undefined,
  validCategories: string[],
  defaultValue = 'all'
): string {
  if (!value) return defaultValue;
  const cleaned = value.trim().toLowerCase();
  return validCategories.includes(cleaned) ? cleaned : defaultValue;
}

/**
 * Validates an ID parameter
 * @param value - ID value to validate
 * @returns Validated ID or null if invalid
 */
export function validateId(value: string | null | undefined): string | null {
  if (!value) return null;
  
  // Basic UUID validation (can be enhanced)
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidPattern.test(value) ? value : null;
} 