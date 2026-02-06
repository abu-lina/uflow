/**
 * Design system spacing tokens.
 * Rule of 8: all spacing uses multiples of 8px.
 */

export const spacingTokens = {
  /** Base scale (Rule of 8) */
  0: '0',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
  32: '128px',

  /** Semantic spacing */
  'safe-top': 'env(safe-area-inset-top)',
  'safe-bottom': 'env(safe-area-inset-bottom)',
  'safe-left': 'env(safe-area-inset-left)',
  'safe-right': 'env(safe-area-inset-right)',

  /** Header system */
  'header-padding-mobile': '16px',
  'header-padding-desktop': '24px',
  'header-height-mobile': '40px',
  'header-height-tablet': '48px',
  'header-height-desktop': '56px',
  'content-gap': '24px',
  'content-padding-mobile': '16px',
  'content-padding-tablet': '20px',
  'content-padding-desktop': '24px',
  'auth-title-padding-left': '28px',
  'auth-title-padding-right': '16px',

  /** Calculated header spacing */
  'header-spacing': 'calc(env(safe-area-inset-top) + 16px + 40px + 24px)',
  'header-spacing-sm': 'calc(env(safe-area-inset-top) + 24px + 48px + 24px)',
  'header-spacing-md': 'calc(env(safe-area-inset-top) + 24px + 56px + 24px)',

  /** Bottom action bar */
  'bottom-spacing-12': 'calc(48px + 1rem + max(12px, env(safe-area-inset-bottom)))',
  'bottom-spacing-16': 'calc(64px + 1rem + max(12px, env(safe-area-inset-bottom)))',
  'bottom-spacing-subpage': 'calc(80px + 1rem + max(12px, env(safe-area-inset-bottom)))',

  /** Icon sizes */
  'icon-xs': '16px',
  'icon-sm': '20px',
  'icon-md': '24px',
  'icon-lg': '32px',
  'icon-xl': '48px',
  'icon-2xl': '64px',
  'icon-3xl': '96px',
  'icon-4xl': '144px',
} as const;

export type SpacingTokens = typeof spacingTokens;
