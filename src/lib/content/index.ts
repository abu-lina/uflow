/**
 * Content
 * 
 * This module provides centralized access to static content used throughout the application.
 * Includes quotes, messages, and other text content that doesn't need to be stored in the database.
 */

// Types
export * from './types';

// Quotes
export {
  QUOTES,
  QUOTES_CONFIG,
  getQuotesByLanguage,
  getQuotesByCategory
} from './quotes'; 