/**
 * API Constants
 * 
 * This module provides type-safe API configuration and endpoints.
 * Organized by domain and environment (client/server).
 */

import { z } from 'zod';

// API Configuration Schema
export const ApiConfigSchema = z.object({
  timeout: z.number().default(30000),
  retryAttempts: z.number().default(3),
  retryDelay: z.number().default(1000),
});

export type ApiConfig = z.infer<typeof ApiConfigSchema>;

// API Headers
export const API_HEADERS = {
  CONTENT_TYPE: 'Content-Type',
  AUTHORIZATION: 'Authorization',
  ACCEPT: 'Accept',
} as const;

// Base API URL
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// API Version
export const API_VERSION = 'v1'; 