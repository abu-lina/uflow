/**
 * Design system typography tokens.
 * Minor Third scale (1.2 ratio), base 16px.
 */

export const typographyTokens = {
  fontFamily: {
    base: ['Inter', 'sans-serif'],
    heading: ['Inter Tight', 'sans-serif'],
    'inter-tight': ['Inter Tight', 'sans-serif'],
    inter: ['Inter', 'sans-serif'],
    baskerville: ['Baskerville', 'serif'],
    montserrat: ['Montserrat', 'sans-serif'],
  },

  fontSize: {
    xs: ['0.694rem', { lineHeight: '1rem' }],       // 11px
    sm: ['0.833rem', { lineHeight: '1.25rem' }],    // 13px
    base: ['1rem', { lineHeight: '1.5rem' }],       // 16px
    lg: ['1.2rem', { lineHeight: '1.625rem' }],    // 19px
    xl: ['1.44rem', { lineHeight: '1.875rem' }],    // 23px
    '2xl': ['1.728rem', { lineHeight: '2.125rem' }], // 27px
    '3xl': ['2.074rem', { lineHeight: '2.25rem' }],  // 33px
    '4xl': ['2.488rem', { lineHeight: '2.625rem' }], // 40px
    '5xl': ['2.986rem', { lineHeight: '3.125rem' }], // 48px
  },

  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

export type TypographyTokens = typeof typographyTokens;
