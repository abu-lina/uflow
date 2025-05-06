/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter Tight', 'sans-serif'],
        heading: ['Montserrat', 'sans-serif'],
      },
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.25rem',
        xl: '1.563rem',
        '2xl': '1.953rem',
        '3xl': '2.441rem',
        '4xl': '3.052rem',
      },
      fontWeight: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
      colors: {
        primary: '#589D96',
        'primary-light': '#BFDBD8',
        text: '#232323',
        'neutral-light': '#EEEEEE',
        neutral: '#CDCDCD',
        border: '#D4D4D4',
        success: '#10b981',
        danger: '#ef4444',
        warning: '#f59e42',
        info: '#3b82f6',
        muted: '#f5f5f5',
      },
      backgroundImage: {
        background: 'linear-gradient(180deg, #F5F5F5 0%, #FBFBFB 100%)',
        'accent-gold-gradient':
          'linear-gradient(90deg, #D2B581 4.35%, #E5D1A0 52.17%, #AF8650 100%)',
        'accent-gold-gradient-light':
          'linear-gradient(90deg, #F3E7D0 4.35%, #E5D1A0 52.17%, #EEE3D6 100%)',
        'accent-gold-radial':
          'radial-gradient(47.83% 95.65% at 52.17% 47.83%, #D2B581 0%, #E5D1A0 50%, #D2B581 100%)',
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '16px',
        full: '9999px',
      },
      spacing: {
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        5: '20px',
        6: '24px',
        8: '32px',
        10: '40px',
        12: '48px',
        16: '64px',
        20: '80px',
        24: '96px',
        32: '128px',
        40: '160px',
        48: '192px',
        56: '224px',
        64: '256px',
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
};
