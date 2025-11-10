/**
 * Color constants for the application
 * Centralized color definitions for consistency and maintainability
 */

// Primary brand colors
export const COLORS = {
  // Primary brand color (semantic token)
  // State mapping: Use with CSS pseudo-classes
  // - Default: primary
  // - Hover: hover:bg-primary-dark
  // - Pressed: active:bg-primary-darker
  // - Selected: bg-primary-light
  primary: '#589D96',         // Default state (breaker-bay-400)
  primaryDark: '#438983',     // Hover state (breaker-bay-500)
  primaryDarker: '#356e6a',   // Pressed/clicked state (breaker-bay-600)
  primaryLight: '#b8d6d2',    // Light backgrounds/selected (breaker-bay-200)
  
  // Legacy aliases (for backward compatibility)
  /** @deprecated Use `primaryDark` instead */
  primaryHover: '#438983',
  /** @deprecated Use `primaryDarker` instead */
  primaryPressed: '#356e6a',
  /** @deprecated Use `primaryLight` instead */
  primaryActive: '#b8d6d2',
  
  // Legacy aliases (for backward compatibility)
  /** @deprecated Use `primary` instead */
  mint: '#589D96',
  /** @deprecated Use `primaryDark` instead */
  mintDark: '#4A8A84',
  /** @deprecated Use `primaryPressed` instead */
  mintPressed: '#49837D',
  /** @deprecated Use `primaryLight` instead */
  mintLight: '#BFDBD8',
  
  // Gold gradient colors (for Barik button)
  gold: {
    start: '#d2b581',
    middle: '#e5d1a0',
    end: '#af8650',
    gradient: 'linear-gradient(to right, #d2b581 4.348%, #e5d1a0 52.174%, #af8650 100%)',
  },
  
  // Semantic colors
  white: '#FFFFFF',
  black: '#232323',
  neutral: '#CDCDCD',
  neutralLight: '#EEEEEE',
  border: '#D4D4D4',
  
  // Legacy aliases (for backward compatibility)
  /** @deprecated Use `neutral` instead */
  grey: '#CDCDCD',
  /** @deprecated Use `neutralLight` instead */
  greyLight: '#EEEEEE',
} as const;

// RGBA helpers for shadows and overlays
export const COLORS_RGBA = {
  primary: {
    pressed: 'rgba(73, 131, 125, 0.7)', // #49837D at 70% opacity
    shadowHover: 'rgba(73, 131, 125, 0.15)',
    shadow: 'rgba(73, 131, 125, 0.1)',
  },
  // Legacy aliases (for backward compatibility)
  /** @deprecated Use `primary` instead */
  mint: {
    pressed: 'rgba(73, 131, 125, 0.7)',
    shadowHover: 'rgba(73, 131, 125, 0.15)',
    shadow: 'rgba(73, 131, 125, 0.1)',
  },
  /** @deprecated Use `primary` instead */
  mintOld: {
    shadowHover: 'rgba(88, 157, 150, 0.15)',
    shadow: 'rgba(88, 157, 150, 0.1)',
  },
} as const;


