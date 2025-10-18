import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    // uFlow colors
    'text-mint',
    'text-mint-light',
    'bg-mint',
    'bg-mint-light',
    'border-mint',
    'ring-mint',
    'hover:text-mint',
    'hover:bg-mint',
    'focus:ring-mint',
    'focus:border-mint',
    'text-text',
    'text-grey',
    'text-grey-light',
    'bg-grey',
    'bg-grey-light',
    'border-border',
    'bg-uflow-light',
    'bg-gold-gradient',
    'bg-gold-gradient-light',
    'bg-gold-gradient-radial',
    // Warning colors
    'bg-warning-soft',
    'border-warning/20',
    'text-warning/90',
    // Font families
    'font-inter-tight',
    // Hover and focus states
    'hover:bg-mint/90',
    'focus-visible:ring-mint',
    // Icon sizes (Lucide standardized)
    'w-icon-xs',
    'h-icon-xs',
    'w-icon-sm',
    'h-icon-sm',
    'w-icon-md',
    'h-icon-md',
    'w-icon-lg',
    'h-icon-lg',
    'w-icon-xl',
    'h-icon-xl',
    'w-icon-2xl',
    'h-icon-2xl',
    'w-icon-3xl',
    'h-icon-3xl',
    // Icon colors
    'text-success',
    'text-info',
    'text-warning',
    'text-danger',
    // Header spacing utilities
    'h-header-spacing',
    'h-header-spacing-sm',
    'h-header-spacing-md',
  ],
  theme: {
    screens: {
      'xs': '376px',  // Custom breakpoint for devices larger than iPhone SE
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
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
      spacing: {
        // Following the Rule of 8 - Design System Spacing Scale
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
        // Safe area utilities
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
        // Header system design tokens - direct values for Tailwind compatibility
        'header-padding-mobile': '16px',
        'header-padding-desktop': '24px',
        'header-height-mobile': '40px',
        'header-height-tablet': '48px',
        'header-height-desktop': '56px',
        'content-gap': '32px', // Standard gap between header and content
        
        // Content padding design tokens for consistency
        'content-padding-mobile': '16px',    // Mobile horizontal padding (px-4)
        'content-padding-tablet': '20px',    // Tablet horizontal padding
        'content-padding-desktop': '24px',   // Desktop horizontal padding
        
        // Auth page specific padding tokens
        'auth-title-padding-left': '28px',   // Title section left padding (pl-7)
        'auth-title-padding-right': '16px',  // Title section right padding (pr-4)
        // Calculated header spacing - uses design tokens above for consistent spacing
        'header-spacing': 'calc(env(safe-area-inset-top) + 16px + 40px + 32px)', // mobile: safe-area + padding + height + gap
        'header-spacing-sm': 'calc(env(safe-area-inset-top) + 24px + 48px + 32px)', // tablet: safe-area + padding + height + gap  
        'header-spacing-md': 'calc(env(safe-area-inset-top) + 24px + 56px + 32px)', // desktop: safe-area + padding + height + gap
        // Icon sizes (for Lucide icons - standardized)
        'icon-xs': '16px',   // Extra small icons (inline with text)
        'icon-sm': '20px',   // Small icons (buttons, inputs)
        'icon-md': '24px',   // Medium icons (default)
        'icon-lg': '32px',   // Large icons (headers)
        'icon-xl': '48px',   // Extra large icons (feature highlights)
        'icon-2xl': '64px',  // 2X large icons (success states, hero)
        'icon-3xl': '96px',  // 3X large icons (major success/error states)
      },
      colors: {
        primary: {
          DEFAULT: '#589D96', // Brand mint green
          light: '#BFDBD8',
          dark: '#4A8A84',
        },
        background: {
          DEFAULT: '#FFFFFF',
          dark: '#1F2937',
        },
        content: {
          DEFAULT: '#555555', // Main content text
          title: '#232323', // Title/heading text
        },
        border: '#D4D4D4', // uflow-light-boarder
        // Semantic colors (updated color palette)
        success: {
          DEFAULT: '#4CA987', // Updated success green
          light: '#7BC4A9',
          dark: '#3D8A6D',
        },
        warning: {
          DEFAULT: '#E6A94C', // Updated warning orange
          soft: '#FDF5E6', // Soft amber background
          light: '#EFBC73',
          dark: '#C48A3A',
        },
        danger: {
          DEFAULT: '#D86363', // Updated error red
          light: '#E58989',
          dark: '#B84F4F',
        },
        info: {
          DEFAULT: '#4F9BAE', // Updated info blue
          light: '#7AB5C5',
          dark: '#3F7C8B',
        },
        // uFlow brand colors (aliases for consistency)
        mint: {
          DEFAULT: '#589D96', // uflow-mint (same as primary)
          light: '#BFDBD8', // uflow-light-mint
        },
        grey: {
          DEFAULT: '#CDCDCD', // uflow-grey
          light: '#EEEEEE', // uflow-light-grey
        },
        // Add any other semantic colors used in your codebase here
      },
      borderRadius: {
        xs: '8px',
        sm: '12px',
        md: '14px',
        lg: '16.8px',
        full: '9999px',
      },
      height: {
        'header-height-mobile': '40px',
        'header-height-tablet': '48px', 
        'header-height-desktop': '56px',
        // Header spacing utilities for proper content positioning
        // Must match PageHeader: pt-[calc(env(safe-area-inset-top)+16px)] + h-40 + gap
        'header-spacing': 'calc(env(safe-area-inset-top) + 16px + 40px + 16px)', // mobile: safe-area + padding + height + gap
        'header-spacing-sm': 'calc(env(safe-area-inset-top) + 24px + 48px + 16px)', // tablet: safe-area + padding + height + gap  
        'header-spacing-md': 'calc(env(safe-area-inset-top) + 24px + 56px + 16px)', // desktop: safe-area + padding + height + gap
      },
      backgroundImage: {
        'uflow-light': 'linear-gradient(180deg, #F5F5F5 0%, #FBFBFB 100%)',
        'gold-gradient': 'linear-gradient(90deg, #D2B581 4.35%, #E5D1A0 52.17%, #AF8650 100%)',
        'gold-gradient-light':
          'linear-gradient(90deg, #F3E7D0 4.35%, #E5D1A0 52.17%, #EEE3D6 100%)',
        'gold-gradient-radial':
          'radial-gradient(47.83% 95.65% at 52.17% 47.83%, #D2B581 0%, #E5D1A0 50%, #D2B581 100%)',
      },
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
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '65ch',
            color: 'hsl(var(--foreground))',
            a: {
              color: '#589D96',
              '&:hover': {
                color: '#589D96',
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
