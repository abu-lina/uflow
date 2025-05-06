import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter-tight)'],
        'inter-tight': ['Inter Tight', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        baskerville: ['Baskerville', 'serif'],
        'font-inter': ['Inter', 'sans-serif'],
      },
      fontSize: {
        // Following modular scale (1.25x)
        xs: ['0.75rem', { lineHeight: '1rem' }], // 12px
        sm: ['0.875rem', { lineHeight: '1.25rem' }], // 14px
        base: ['1rem', { lineHeight: '1.5rem' }], // 16px
        lg: ['1.25rem', { lineHeight: '1.75rem' }], // 20px
        xl: ['1.5625rem', { lineHeight: '2rem' }], // 25px
        '2xl': ['1.953rem', { lineHeight: '2.5rem' }], // 31.25px
        '3xl': ['2.441rem', { lineHeight: '3rem' }], // 39.06px
        '4xl': ['3.052rem', { lineHeight: '3.5rem' }], // 48.83px
      },
      spacing: {
        // Following Rule of 8
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
      },
      colors: {
        // Brand colors
        brand: {
          primary: '#589D96',
          secondary: '#BFDBD8',
        },
        // Background gradient colors
        gradient: {
          start: '#F5F5F5',
          end: '#FBFBFB',
        },
        // Semantic colors for text and UI
        text: {
          primary: '#232323',
          secondary: '#7A7A7A',
          muted: '#7C7C7C',
        },
        border: {
          light: '#CDCDCD',
          DEFAULT: '#E5E7EB',
        },
        // Semantic colors
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: '#589D96',
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        'text-primary': '#232323',
        'text-secondary': '#7A7A7A',
        'text-muted': '#7C7C7C',
        'text-foreground': 'hsl(var(--foreground))',
        'text-primary-foreground': 'hsl(var(--primary-foreground))',
        'text-destructive-foreground': 'hsl(var(--destructive-foreground))',
        'text-surface-foreground': 'hsl(var(--surface-foreground))',
        'bg-brand-primary': '#589D96',
        'bg-surface': 'hsl(var(--surface))',
        'bg-destructive': 'hsl(var(--destructive))',
        'bg-secondary': 'hsl(var(--secondary))',
        'bg-background': 'hsl(var(--background))',
        'bg-gradient-start': '#F5F5F5',
        'bg-gradient-end': '#FBFBFB',
        'border-border-light': '#CDCDCD',
        'border-input': 'hsl(var(--input))',
        'ring-primary': 'hsl(var(--ring))',
        'ring-ring': 'hsl(var(--ring))',
        'surface': 'hsl(var(--surface))',
        'surface-foreground': 'hsl(var(--surface-foreground))',
        'primary-foreground': 'hsl(var(--primary-foreground))',
        'secondary-foreground': 'hsl(var(--secondary-foreground))',
        'accent-foreground': 'hsl(var(--accent-foreground))',
        'muted-foreground': 'hsl(var(--muted-foreground))',
        'destructive-foreground': 'hsl(var(--destructive-foreground))',
      },
      borderRadius: {
        xs: '8px',
        sm: '12px',
        md: '14px',
        lg: '16.8px',
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
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
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
      backgroundImage: {
        'uflow-light': 'linear-gradient(180deg, #F5F5F5 0%, #FBFBFB 100%)',
      },
    },
  },
  plugins: [forms, typography],
};

export default config;
