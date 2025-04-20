export const APP_CONFIG = {
  name: 'Ummah Flow',
  description: 'Your trusted marketplace for Islamic services',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
} as const;

export const PAGINATION = {
  defaultPageSize: 9,
  maxPageSize: 100,
} as const;

export const SERVICE_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  REJECTED: 'rejected',
  ARCHIVED: 'archived',
  SUSPENDED: 'suspended',
} as const;

export const AUTH_ERRORS = {
  NOT_AUTHENTICATED: 'Not authenticated',
  UNAUTHORIZED: 'Unauthorized',
  INVALID_CREDENTIALS: 'Invalid credentials',
} as const;

export const ROUTES = {
  HOME: '/',
  SERVICES: '/services',
  SERVICE_DETAILS: (id: string) => `/services/${id}`,
  PROFILE: '/profile',
  SETTINGS: '/settings',
  AUTH: {
    SIGN_IN: '/auth/signin',
    SIGN_UP: '/auth/signup',
    FORGOT_PASSWORD: '/auth/forgot-password',
  },
} as const; 