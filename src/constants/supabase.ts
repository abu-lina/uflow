/**
 * Supabase Constants
 * 
 * Constants related to Supabase configuration and database tables.
 * These values are used for database operations and type safety.
 */

// Database Tables
export const TABLES = {
  users: 'users',
  profiles: 'profiles',
  items: 'items',
  categories: 'categories',
  transactions: 'transactions',
} as const;

// Storage Buckets
export const BUCKETS = {
  avatars: 'avatars',
  items: 'items',
} as const;

// Database Policies
export const POLICIES = {
  public: 'public',
  authenticated: 'authenticated',
  owner: 'owner',
} as const;

// Database Functions
export const FUNCTIONS = {
  search: 'search_items',
  nearby: 'find_nearby_items',
} as const; 