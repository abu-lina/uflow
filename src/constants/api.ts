/**
 * API Constants
 * 
 * Constants related to API configuration, such as endpoints,
 * timeouts, and other API-related properties.
 */

// API Endpoints
export const API_ENDPOINTS = {
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    logout: '/api/auth/logout',
    refresh: '/api/auth/refresh',
  },
  profile: {
    get: '/api/profile',
    update: '/api/profile',
    delete: '/api/profile',
  },
  items: {
    list: '/api/items',
    create: '/api/items',
    get: (id: string) => `/api/items/${id}`,
    update: (id: string) => `/api/items/${id}`,
    delete: (id: string) => `/api/items/${id}`,
  },
} as const;

// API Timeouts
export const API_TIMEOUTS = {
  default: 10000,
  upload: 30000,
  download: 30000,
} as const;

// API Headers
export const API_HEADERS = {
  contentType: 'Content-Type',
  authorization: 'Authorization',
  accept: 'Accept',
} as const;

// API Methods
export const API_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
} as const; 