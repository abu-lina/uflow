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
    // Font families
    'font-inter-tight',
    // Hover and focus states
    'hover:bg-mint/90',
    'focus-visible:ring-mint',
  ],
  theme: {
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
        // Following the Rule of 8
        '2': '8px',
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
      },
      colors: {
        primary: {
          DEFAULT: '#589D96',
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
        danger: {
          DEFAULT: '#DC2626',
          light: '#EF4444',
        },
        success: 'hsl(160, 84%, 39%)', // #10b981
        warning: 'hsl(35, 92%, 60%)', // #f59e42
        info: 'hsl(217, 91%, 60%)', // #3b82f6
        // uFlow brand colors
        mint: {
          DEFAULT: '#589D96', // uflow-mint
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
