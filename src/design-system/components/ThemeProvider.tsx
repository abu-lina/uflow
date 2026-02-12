'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import type { Theme, ThemeContextType } from '../themes/theme.types';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY_DEFAULT = 'uflow-theme';

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = 'default',
  storageKey = STORAGE_KEY_DEFAULT,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync React state with DOM (theme already applied by blocking script in layout)
  useEffect(() => {
    if (!mounted || typeof document === 'undefined') return;
    const applied = document.documentElement.getAttribute('data-theme') as Theme | null;
    if (applied) setThemeState(applied);
  }, [mounted]);

  // When user changes theme via setTheme, keep DOM in sync
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute('data-theme', theme);
  }, [mounted, theme]);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme);
      try {
        localStorage.setItem(storageKey, newTheme);
      } catch {
        // ignore
      }
      document.documentElement.setAttribute('data-theme', newTheme);
    },
    [storageKey],
  );

  const value: ThemeContextType = {
    theme,
    setTheme,
    availableThemes: ['default', 'dark'],
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
