/**
 * Library Modules
 *
 * This module provides core functionality and utilities for the application:
 * - constants: Application-wide constants and configuration
 * - services: Business logic services
 * - supabase: Database infrastructure
 * - utils: Helper functions and utilities
 */

// Core modules
export * from './constants';
export * from './utils';

// Supabase
export * from './supabase';
export type { Database } from '@/types/supabase';

// Auth
export * from './auth';

// Re-export hooks
export * from './hooks/useSupabaseQuery';

// Services exports
export * from './services/api';

// Utils exports
export * from './utils/validation';
export * from './utils/helpers';
