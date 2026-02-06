/**
 * Theme type definitions for the design system.
 */

export type Theme = 'default' | 'dark' | string;

export interface ThemeConfig {
  colors: Record<string, string | Record<string, string>>;
}

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  availableThemes: Theme[];
}
