/**
 * Color constants for the application
 * Centralized color definitions for consistency and maintainability
 */

// Primary brand colors
export const COLORS = {
  // Mint green (primary brand color)
  mint: '#589D96',
  mintDark: '#4A8A84',
  mintPressed: '#49837D', // Pressed state and saved button
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
  grey: '#CDCDCD',
  greyLight: '#EEEEEE',
  border: '#D4D4D4',
} as const;

// RGBA helpers for shadows and overlays
export const COLORS_RGBA = {
  mint: {
    pressed: 'rgba(73, 131, 125, 0.7)', // #49837D at 70% opacity
    shadowHover: 'rgba(73, 131, 125, 0.15)',
    shadow: 'rgba(73, 131, 125, 0.1)',
  },
  mintOld: {
    shadowHover: 'rgba(88, 157, 150, 0.15)',
    shadow: 'rgba(88, 157, 150, 0.1)',
  },
} as const;

