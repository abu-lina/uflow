/**
 * Library Modules
 * 
 * This module provides core functionality and utilities for the application:
 * - constants: Application-wide constants and configuration
 * - services: Business logic services
 * - supabase: Database infrastructure
 * - utils: Helper functions and utilities
 */

// Constants
export * from './constants';

// Services
export * from './services';

// Supabase
export * from './supabase';

// Utilities
export * from './utils';

// Re-export hooks
export * from './hooks/useSupabaseQuery';

// Re-export database utilities
export { createServerClient, createAdminClient } from './database/supabase-server';
export type { Database } from '@/types/database';

// Re-export auth utilities
export * from './auth';

// Supabase exports
export * from './supabase/queries'
export * from './supabase/types'

// Services exports
export * from './services/api'

// Utils exports
export * from './utils/validation'
export * from './utils/helpers' 