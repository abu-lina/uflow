/**
 * Design system border radius tokens.
 */

export const borderTokens = {
  none: '0',
  xs: '8px',
  sm: '12px',
  md: '14px',
  lg: '16.8px',
  xl: '20px',
  full: '9999px',
} as const;

export type BorderTokens = typeof borderTokens;
