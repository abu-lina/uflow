/**
 * Application Routes
 * 
 * Type-safe application routes organized by access level and domain.
 */

import { z } from 'zod';

// Route Parameter Schema
export const RouteParamsSchema = z.object({
  id: z.string(),
  slug: z.string().optional(),
});

export type RouteParams = z.infer<typeof RouteParamsSchema>;

// Base Routes
export const BASE_ROUTES = {
  HOME: '/',
  ABOUT: '/about',
  CONTACT: '/contact',
} as const;

// Auth Routes
export const AUTH_ROUTES = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
} as const;

// Protected Routes
export const PROTECTED_ROUTES = {
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  SETTINGS: '/settings',
} as const;

// Marketplace Routes
export const MARKETPLACE_ROUTES = {
  HOME: '/marketplace',
  LIST: '/marketplace/list',
  DETAIL: (params: RouteParams) => `/marketplace/${params.id}`,
  CREATE: '/marketplace/create',
  EDIT: (params: RouteParams) => `/marketplace/${params.id}/edit`,
} as const;

// Combine all routes
export const ROUTES = {
  ...BASE_ROUTES,
  AUTH: AUTH_ROUTES,
  PROTECTED: PROTECTED_ROUTES,
  MARKETPLACE: MARKETPLACE_ROUTES,
} as const; 