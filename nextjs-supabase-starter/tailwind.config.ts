import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';

/**
 * Tailwind CSS Configuration
 *
 * Best Practices Applied:
 * - Minimal safelist (only dynamic classes)
 * - Semantic color tokens reference base palettes
 * - Organized sections with clear comments
 * - Design tokens for consistency
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
 */

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],

  theme: {
    screens: {
      xs: '376px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },

    extend: {
      // Typography
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },

      fontSize: {
        xs: ['0.694rem', { lineHeight: '1rem' }],
        sm: ['0.833rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.2rem', { lineHeight: '1.625rem' }],
        xl: ['1.44rem', { lineHeight: '1.875rem' }],
        '2xl': ['1.728rem', { lineHeight: '2.125rem' }],
        '3xl': ['2.074rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.488rem', { lineHeight: '2.625rem' }],
        '5xl': ['2.986rem', { lineHeight: '3.125rem' }],
      },

      // Spacing & Layout
      spacing: {
        'header-height': '64px',
        'content-padding': '24px',
      },

      // Colors
      colors: {
        // Base color palettes
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
          900: '#3d3d3d',
          950: '#0b0b0b',
        },

        'breaker-bay': {
          50: '#f6f9f8',
          100: '#dbebe8',
          200: '#b8d6d2',
          300: '#8cbab3',
          400: '#589d96',
          500: '#438983',
          600: '#356e6a',
          700: '#2d5855',
          800: '#274948',
          900: '#243d3c',
          950: '#102322',
        },

        // Semantic Color Tokens
        primary: {
          DEFAULT: '#589d96',
          light: '#b8d6d2',
          dark: '#438983',
          darker: '#356e6a',
        },

        background: {
          DEFAULT: '#FFFFFF',
          dark: '#1F2937',
        },

        content: {
          DEFAULT: '#3d3d3d',
          heading: '#0b0b0b',
          muted: '#888888',
        },

        border: {
          DEFAULT: '#D4D4D4',
          light: '#E7E7E7',
          muted: '#E7E7E7',
        },

        neutral: {
          DEFAULT: '#CDCDCD',
          light: '#EEEEEE',
          muted: '#F6F6F6',
        },

        // Status Colors
        success: {
          DEFAULT: '#4CA987',
          light: '#7BC4A9',
          dark: '#3D8A6D',
          soft: '#E8F5F0',
        },

        warning: {
          DEFAULT: '#E6A94C',
          light: '#EFBC73',
          dark: '#C48A3A',
          soft: '#FDF5E6',
        },

        danger: {
          DEFAULT: '#D86363',
          light: '#E58989',
          dark: '#B84F4F',
          soft: '#FCE8E8',
        },

        info: {
          DEFAULT: '#4F9BAE',
          light: '#7AB5C5',
          dark: '#3F7C8B',
          soft: '#E6F2F5',
        },
      },

      // Border Radius
      borderRadius: {
        xs: '8px',
        sm: '12px',
        md: '14px',
        lg: '16.8px',
        full: '9999px',
      },

      // Animations
      keyframes: {
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.5' },
        },
      },

      animation: {
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },

  plugins: [forms],
};

export default config;



