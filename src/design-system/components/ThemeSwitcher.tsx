'use client';

import { useTheme } from './ThemeProvider';

interface ThemeSwitcherProps {
  className?: string;
}

/**
 * Theme switcher UI: toggles between default and dark theme.
 * Renders buttons for each available theme. Use inside ThemeProvider.
 */
export function ThemeSwitcher({ className = '' }: ThemeSwitcherProps) {
  const { theme, setTheme, availableThemes } = useTheme();

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${className}`}
      role="group"
      aria-label="Theme selection"
    >
      {availableThemes.map((t) => (
        <button
          key={t}
          type="button"
          aria-pressed={theme === t}
          className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            theme === t
              ? 'border-primary bg-primary text-white'
              : 'border-border bg-background text-content hover:bg-neutral-50'
          }`}
          onClick={() => setTheme(t)}
        >
          {t === 'default' ? 'Light' : t === 'dark' ? 'Dark' : t}
        </button>
      ))}
    </div>
  );
}
