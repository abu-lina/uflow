/**
 * Default theme - maps to CSS variables in :root.
 * Values are HSL components (H S% L%) for hsl(var(--color-*)).
 */

import { colorTokens } from '../tokens/colors';
import type { ThemeConfig } from './theme.types';

export const defaultTheme: ThemeConfig = {
  colors: {
    ...colorTokens,
  } as ThemeConfig['colors'],
};
