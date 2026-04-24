/**
 * Design system color tokens.
 * Values are HSL components (hue, saturation%, lightness%) for use with
 * CSS variables: hsl(var(--color-primary)).
 * Opacity modifiers work: bg-primary/50
 */

export const colorTokens = {
  /** Brand / primary actions */
  primary: {
    DEFAULT: '180 24% 48%',
    light: '180 24% 78%',
    dark: '180 24% 38%',
    darker: '180 24% 28%',
  },

  /** Secondary brand (optional) */
  secondary: {
    DEFAULT: '180 24% 38%',
    light: '180 24% 88%',
    dark: '180 24% 28%',
  },

  /** Success state */
  success: {
    DEFAULT: '158 36% 48%',
    light: '158 36% 62%',
    dark: '158 38% 38%',
    soft: '158 40% 93%',
  },

  /** Warning state */
  warning: {
    DEFAULT: '38 76% 60%',
    light: '38 80% 70%',
    dark: '38 55% 50%',
    soft: '38 85% 95%',
  },

  /** Danger / error state */
  danger: {
    DEFAULT: '0 52% 63%',
    light: '0 65% 72%',
    dark: '0 42% 51%',
    soft: '0 75% 95%',
  },

  /** Info state */
  info: {
    DEFAULT: '197 38% 50%',
    light: '197 38% 62%',
    dark: '197 38% 39%',
    soft: '197 45% 93%',
  },

  /** Neutral palette (gray scale) */
  neutral: {
    50: '0 0% 96%',
    100: '0 0% 91%',
    200: '0 0% 82%',
    300: '0 0% 69%',
    400: '0 0% 53%',
    500: '0 0% 43%',
    600: '0 0% 36%',
    700: '0 0% 31%',
    800: '0 0% 27%',
    900: '0 0% 24%',
    950: '0 0% 4%',
  },

  /** Surface / background colors */
  background: {
    DEFAULT: '0 0% 100%',
    selection: '170 30% 96%',
  },
  surface: '0 0% 98%',
  overlay: '0 0% 0%',

  /** Text colors */
  text: {
    primary: '0 0% 14%',
    secondary: '0 0% 33%',
    muted: '0 0% 53%',
    inverse: '0 0% 100%',
  },

  /** Border colors */
  border: {
    DEFAULT: '0 0% 83%',
    light: '0 0% 91%',
    muted: '0 0% 96%',
  },

  /** State colors (hover, active, disabled, focus) */
  state: {
    hover: '0 0% 96%',
    active: '0 0% 91%',
    disabled: '0 0% 80%',
    focus: '180 24% 48%',
  },
} as const;

export type ColorTokens = typeof colorTokens;
