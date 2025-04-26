/**
 * Content Types
 * 
 * Type definitions for static content used throughout the application.
 */

export interface Quote {
  /** The text content of the quote */
  text: string;
  /** The source or author of the quote */
  author: string;
  /** Optional category for organizing quotes */
  category?: string;
  /** Optional language code (ISO 639-1) */
  language?: string;
}

export interface ContentConfig {
  /** Default language for content */
  defaultLanguage: string;
  /** Supported languages */
  supportedLanguages: string[];
  /** Content update frequency in milliseconds */
  updateFrequency: number;
} 