import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';

/**
 * Tailwind CSS Configuration
 * 
 * Best Practices Applied:
 * - Minimal safelist (only dynamic classes)
 * - Semantic color tokens reference base palettes
 * - Organized sections with clear comments
 * - Design tokens for consistency
 * - Tailwind 4 compatible structure
 * 
 * Naming Conventions:
 * ===================
 * 
 * 1. Base Color Palettes (Descriptive Names)
 *    - Use descriptive palette names: `cod-gray`, `breaker-bay`
 *    - Follow Tailwind 4 structure: 50-950 shades
 *    - Purpose: Raw color values, rarely used directly
 * 
 * 2. Semantic Color Tokens (Purpose-Based)
 *    - Use purpose-based names: `primary`, `content`, `background`, `border`, `neutral`
 *    - Variants: `DEFAULT`, `light`, `dark`, `muted`, `soft`
 *    - Purpose: Express intent, not appearance
 *    - Examples:
 *      * `primary` - Brand/primary actions
 *      * `content` - Text colors (DEFAULT, heading, muted)
 *      * `background` - Page/component backgrounds
 *      * `border` - Border colors
 *      * `neutral` - Neutral/muted UI elements
 * 
 * 3. Status Colors (Semantic)
 *    - Use semantic names: `success`, `warning`, `danger`, `info`
 *    - Consistent variants: `DEFAULT`, `light`, `dark`, `soft`
 *    - Purpose: Communicate state/status
 * 
 * 4. Legacy Colors (Deprecated)
 *    - Marked with `@deprecated` comments
 *    - Maintained for backward compatibility
 *    - Migration path documented in comments
 *    - Examples: `mint` → use `primary`, `grey` → use `neutral`
 * 
 * Best Practices:
 * - Always prefer semantic tokens over base palettes
 * - Use `content.heading` for headings/icons, not `cod-gray-950`
 * - Use `primary` instead of `breaker-bay-400`
 * - Use `neutral` instead of `grey` for new code
 * - Status colors should use consistent variant naming
 */

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
    './src/design-system/**/*.{js,ts,jsx,tsx,mdx}',
  ],

  // Minimal safelist - only for truly dynamic classes that can't be detected
  safelist: [
    // Semantic status colors (with variants)
    'text-success',
    'bg-success-soft',
    'text-info',
    'bg-info-soft',
    'text-warning',
    'bg-warning-soft',
    'text-danger',
    'bg-danger-soft',
    'border-warning/20',
    'text-warning/90',
    // Semantic neutral colors
    'bg-neutral-50',
    'bg-neutral-100',
    'bg-neutral-muted',
    'text-neutral',
    'text-text-primary',
    'text-text-muted',
    'bg-surface',
    // Custom utilities that might be generated dynamically
    'h-header-spacing',
    'h-header-spacing-sm',
    'h-header-spacing-md',
    'h-bottom-spacing-12',
    'h-bottom-spacing-16',
    'h-bottom-spacing-subpage',
  ],

  theme: {
    screens: {
      xs: '376px', // Custom breakpoint for devices larger than iPhone SE
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },

    extend: {
      // ============================================
      // Typography
      // ============================================
      fontFamily: {
        'inter-tight': ['Inter Tight', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        baskerville: ['Baskerville', 'serif'],
        heading: ['Montserrat', 'sans-serif'],
      },

      fontSize: {
        // Minor Third scale (1.2 ratio) - base = 16px
        // 11 → 13 → 16 → 19 → 23 → 27 → 33 → 40 → 48
        xs: ['0.694rem', { lineHeight: '1rem' }],      // 11px / 16px
        sm: ['0.833rem', { lineHeight: '1.25rem' }],  // 13px / 20px
        base: ['1rem', { lineHeight: '1.5rem' }],     // 16px / 24px (base)
        lg: ['1.2rem', { lineHeight: '1.625rem' }],   // 19px / 26px
        xl: ['1.44rem', { lineHeight: '1.875rem' }],  // 23px / 30px
        '2xl': ['1.728rem', { lineHeight: '2.125rem' }], // 27px / 34px
        '3xl': ['2.074rem', { lineHeight: '2.25rem' }],  // 33px / 36px (tighter)
        '4xl': ['2.488rem', { lineHeight: '2.625rem' }], // 40px / 42px (tighter)
        '5xl': ['2.986rem', { lineHeight: '3.125rem' }], // 48px / 50px (tighter)
      },

      // ============================================
      // Spacing & Layout
      // ============================================
      spacing: {
        // Base spacing scale (Rule of 8)
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
        '20': '80px',
        '24': '96px',
        '32': '128px',

        // Safe area utilities (for mobile devices)
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',

        // Header system design tokens
        'header-padding-mobile': '16px',
        'header-padding-desktop': '24px',
        'header-height-mobile': '40px',
        'header-height-tablet': '48px',
        'header-height-desktop': '56px',
        'content-gap': '24px', // Standard gap between header and content

        // Content padding design tokens
        'content-padding-mobile': '16px',
        'content-padding-tablet': '20px',
        'content-padding-desktop': '24px',

        // Auth page specific padding tokens
        'auth-title-padding-left': '28px',
        'auth-title-padding-right': '16px',

        // Calculated header spacing utilities
        'header-spacing': 'calc(env(safe-area-inset-top) + 16px + 40px + 24px)',
        'header-spacing-sm': 'calc(env(safe-area-inset-top) + 24px + 48px + 24px)',
        'header-spacing-md': 'calc(env(safe-area-inset-top) + 24px + 56px + 24px)',

        // Bottom action bar spacing
        'bottom-spacing-12': 'calc(48px + 1rem + max(12px, env(safe-area-inset-bottom)))',
        'bottom-spacing-16': 'calc(64px + 1rem + max(12px, env(safe-area-inset-bottom)))',
        'bottom-spacing-subpage': 'calc(80px + 1rem + max(12px, env(safe-area-inset-bottom)))',

        // Icon sizes (Material Symbols - standardized)
        'icon-xs': '16px',
        'icon-sm': '20px',
        'icon-md': '24px',
        'icon-lg': '32px',
        'icon-xl': '48px',
        'icon-2xl': '64px',
        'icon-3xl': '96px',
        'icon-4xl': '144px',
      },

      // ============================================
      // Colors (CSS variables for runtime theme switching)
      // ============================================
      colors: {
        // Brand colors
        primary: {
          DEFAULT: 'hsl(var(--color-primary))',
          light: 'hsl(var(--color-primary-light))',
          dark: 'hsl(var(--color-primary-dark))',
          darker: 'hsl(var(--color-primary-darker))',
        },

        secondary: {
          DEFAULT: 'hsl(var(--color-secondary))',
          light: 'hsl(var(--color-secondary-light))',
          dark: 'hsl(var(--color-secondary-dark))',
        },

        // Semantic status colors
        success: {
          DEFAULT: 'hsl(var(--color-success))',
          light: 'hsl(var(--color-success-light))',
          dark: 'hsl(var(--color-success-dark))',
          soft: 'hsl(var(--color-success-soft))',
        },

        warning: {
          DEFAULT: 'hsl(var(--color-warning))',
          light: 'hsl(var(--color-warning-light))',
          dark: 'hsl(var(--color-warning-dark))',
          soft: 'hsl(var(--color-warning-soft))',
        },

        danger: {
          DEFAULT: 'hsl(var(--color-danger))',
          light: 'hsl(var(--color-danger-light))',
          dark: 'hsl(var(--color-danger-dark))',
          soft: 'hsl(var(--color-danger-soft))',
        },

        info: {
          DEFAULT: 'hsl(var(--color-info))',
          light: 'hsl(var(--color-info-light))',
          dark: 'hsl(var(--color-info-dark))',
          soft: 'hsl(var(--color-info-soft))',
        },

        // Neutral palette
        neutral: {
          50: 'hsl(var(--color-neutral-50))',
          100: 'hsl(var(--color-neutral-100))',
          200: 'hsl(var(--color-neutral-200))',
          300: 'hsl(var(--color-neutral-300))',
          400: 'hsl(var(--color-neutral-400))',
          500: 'hsl(var(--color-neutral-500))',
          600: 'hsl(var(--color-neutral-600))',
          700: 'hsl(var(--color-neutral-700))',
          800: 'hsl(var(--color-neutral-800))',
          900: 'hsl(var(--color-neutral-900))',
          950: 'hsl(var(--color-neutral-950))',
          DEFAULT: 'hsl(var(--color-neutral-300))',
          light: 'hsl(var(--color-neutral-100))',
          muted: 'hsl(var(--color-neutral-50))',
        },

        // Surface colors
        background: {
          DEFAULT: 'hsl(var(--color-background))',
          dark: 'hsl(var(--color-neutral-800))',
          selection: 'hsl(var(--color-background-selection))',
        },

        surface: 'hsl(var(--color-surface))',

        // Text colors (semantic)
        text: {
          primary: 'hsl(var(--color-text-primary))',
          secondary: 'hsl(var(--color-text-secondary))',
          muted: 'hsl(var(--color-text-muted))',
          inverse: 'hsl(var(--color-text-inverse))',
        },

        // Content (backward compatibility: alias for text)
        content: {
          DEFAULT: 'hsl(var(--color-text-primary))',
          heading: 'hsl(var(--color-text-primary))',
          muted: 'hsl(var(--color-text-muted))',
        },

        // Border colors
        border: {
          DEFAULT: 'hsl(var(--color-border-default))',
          light: 'hsl(var(--color-border-light))',
          muted: 'hsl(var(--color-border-muted))',
        },

        // Card (backward compatibility)
        card: {
          DEFAULT: 'hsl(var(--color-surface))',
          foreground: 'hsl(var(--color-text-primary))',
        },

        // Input (for form components)
        input: 'hsl(var(--color-border-default))',
        accent: 'hsl(var(--color-primary))',
        'accent-foreground': 'hsl(var(--color-text-inverse))',

        // Legacy aliases (prefer text-content-heading, text-content, text-content-muted)
        uFlowText: 'hsl(var(--color-text-primary))',
        uFlowText2: 'hsl(var(--color-text-muted))',
        uFlowDarkGrey: 'hsl(var(--color-text-primary))',
      },

      // ============================================
      // Border Radius
      // ============================================
      borderRadius: {
        xs: '8px',
        sm: '12px',
        md: '14px',
        lg: '16.8px',
        full: '9999px',
      },

      // ============================================
      // Height Utilities
      // ============================================
      height: {
        'header-height-mobile': '40px',
        'header-height-tablet': '48px',
        'header-height-desktop': '56px',
        'header-spacing': 'calc(env(safe-area-inset-top) + 16px + 40px + 24px)',
        'header-spacing-sm': 'calc(env(safe-area-inset-top) + 24px + 48px + 24px)',
        'header-spacing-md': 'calc(env(safe-area-inset-top) + 24px + 56px + 24px)',
      },

      // ============================================
      // Background Images
      // ============================================
      backgroundImage: {
        'uflow-light': 'linear-gradient(180deg, #F5F5F5 0%, #FBFBFB 100%)',
        'gold-gradient': 'linear-gradient(90deg, #D2B581 4.35%, #E5D1A0 52.17%, #AF8650 100%)',
        'gold-gradient-light': 'linear-gradient(90deg, #F3E7D0 4.35%, #E5D1A0 52.17%, #EEE3D6 100%)',
        'gold-gradient-radial': 'radial-gradient(47.83% 95.65% at 52.17% 47.83%, #D2B581 0%, #E5D1A0 50%, #D2B581 100%)',
      },

      // ============================================
      // Animations
      // ============================================
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.5' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },

      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        shimmer: 'shimmer 2s infinite',
        'fade-in': 'fade-in 0.6s ease-out forwards',
      },

      // ============================================
      // Typography Plugin Configuration
      // ============================================
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '65ch',
            color: 'hsl(var(--color-text-primary))',
            a: {
              color: 'hsl(var(--color-primary))',
              '&:hover': {
                color: 'hsl(var(--color-primary-dark))',
              },
            },
          },
        },
      },
    },
  },

  plugins: [forms, typography],
};

export default config;
