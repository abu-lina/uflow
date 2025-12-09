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
  ],
  
  // Minimal safelist - only for truly dynamic classes that can't be detected
  // Tailwind automatically detects classes in content files
  safelist: [
    // Dynamic color classes (only if generated programmatically)
    // Most classes should be auto-detected from content files
    {
      pattern: /^(text|bg|border)-(cod-gray|breaker-bay)-(50|100|200|300|400|500|600|700|800|900|950)$/,
    },
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
    'bg-neutral',
    'bg-neutral-light',
    'bg-neutral-muted',
    'text-neutral',
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
      // Colors
      // ============================================
      colors: {
        // Base color palettes (Tailwind 4 style)
        'cod-gray': {
          50: '#f6f6f6',
          100: '#e7e7e7',
          200: '#d1d1d1',
          300: '#b0b0b0',
          400: '#888888',
          500: '#6d6d6d',
          600: '#5d5d5d',
          700: '#4f4f4f',
          800: '#454545',
          900: '#3d3d3d', // Normal text
          950: '#0b0b0b', // Titles and icons
        },

        'breaker-bay': {
          50: '#f6f9f8',
          100: '#dbebe8',
          200: '#b8d6d2',
          300: '#8cbab3',
          400: '#589d96', // Primary brand color
          500: '#438983',
          600: '#356e6a',
          700: '#2d5855',
          800: '#274948',
          900: '#243d3c',
          950: '#102322',
        },

        // ============================================
        // Semantic Color Tokens (Purpose-Based Naming)
        // ============================================
        
        // Primary brand color
        // State mapping: CSS pseudo-classes handle states, tokens provide colors
        // - Default: bg-primary
        // - Hover: hover:bg-primary-dark
        // - Pressed: active:bg-primary-darker
        // - Selected: bg-primary-light
        primary: {
          DEFAULT: '#589d96', // breaker-bay-400 (base/default)
          light: '#b8d6d2',   // breaker-bay-200 (light backgrounds, selected states)
          dark: '#438983',    // breaker-bay-500 (hover states)
          darker: '#356e6a',  // breaker-bay-600 (pressed/clicked states)
        },

        // Background colors
        background: {
          DEFAULT: '#FFFFFF',
          dark: '#1F2937',
        },

        // Content/text colors (semantic naming)
        content: {
          DEFAULT: '#3d3d3d', // cod-gray-900 (normal text)
          heading: '#0b0b0b', // cod-gray-950 (headings and icons)
          muted: '#888888',   // cod-gray-400 (secondary/subdued text)
        },

        // Border colors
        border: {
          DEFAULT: '#D4D4D4',
          light: '#E7E7E7',   // cod-gray-100
          muted: '#E7E7E7',   // Alias for light (semantic alternative)
        },

        // Neutral/muted colors (semantic alternative to "grey")
        neutral: {
          DEFAULT: '#CDCDCD',  // cod-gray-300 (approximate)
          light: '#EEEEEE',  // cod-gray-100 (approximate)
          muted: '#F6F6F6',  // cod-gray-50 (subtle backgrounds)
        },

        // ============================================
        // Semantic Status Colors (Consistent Variants)
        // ============================================
        
        success: {
          DEFAULT: '#4CA987',
          light: '#7BC4A9',
          dark: '#3D8A6D',
          soft: '#E8F5F0',    // Light background variant
        },

        warning: {
          DEFAULT: '#E6A94C',
          light: '#EFBC73',
          dark: '#C48A3A',
          soft: '#FDF5E6',    // Light background variant
        },

        danger: {
          DEFAULT: '#D86363',
          light: '#E58989',
          dark: '#B84F4F',
          soft: '#FCE8E8',    // Light background variant
        },

        info: {
          DEFAULT: '#4F9BAE',
          light: '#7AB5C5',
          dark: '#3F7C8B',
          soft: '#E6F2F5',    // Light background variant
        },

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
      },

      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        shimmer: 'shimmer 2s infinite',
      },

      // ============================================
      // Typography Plugin Configuration
      // ============================================
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '65ch',
            color: 'hsl(var(--foreground))',
            a: {
              color: 'rgb(88, 157, 150)', // primary.DEFAULT - using RGB for CSS-in-JS compatibility
              '&:hover': {
                color: 'rgb(88, 157, 150)', // primary.DEFAULT
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
