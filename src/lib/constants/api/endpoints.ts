/**
 * API Endpoints
 * 
 * Type-safe API endpoints organized by domain.
 */

import { API_BASE_URL, API_VERSION } from './index';

const createEndpoint = (path: string) => `${API_BASE_URL}/api/${API_VERSION}${path}`;

export const ENDPOINTS = {
  AUTH: {
    LOGIN: createEndpoint('/auth/login'),
    REGISTER: createEndpoint('/auth/register'),
    LOGOUT: createEndpoint('/auth/logout'),
    SESSION: createEndpoint('/auth/session'),
  },
  PROFILE: {
    GET: createEndpoint('/profile'),
    UPDATE: createEndpoint('/profile'),
  },
  SOUKS: {
    LIST: createEndpoint('/souks'),
    CREATE: createEndpoint('/souks'),
    DETAIL: (id: string) => createEndpoint(`/souks/${id}`),
  },
} as const; 