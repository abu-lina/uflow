// Auth-related constants
export const AUTH_ERRORS = {
  NOT_AUTHENTICATED: 'Not authenticated',
  UNAUTHORIZED: 'Unauthorized',
  INVALID_CREDENTIALS: 'Invalid credentials',
  SESSION_EXPIRED: 'Session expired',
  INVALID_TOKEN: 'Invalid token',
} as const;

export const AUTH_ROUTES = {
  SIGN_IN: '/auth/signin',
  SIGN_UP: '/auth/signup',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
} as const;

export const AUTH_COOKIE_NAME = 'sb-auth-token';
export const AUTH_REFRESH_INTERVAL = 1000 * 60 * 60; // 1 hour 