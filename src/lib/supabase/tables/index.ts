/**
 * Supabase Table Operations
 * 
 * This module contains all table-specific operations for Supabase,
 * organized by entity type. Each subdirectory corresponds to a database table
 * and contains its CRUD operations.
 * 
 * Structure:
 * - auth: Authentication-related operations
 * - categories: Category management
 * - profiles: User profile management
 * - souks: Marketplace listings
 * - views: Item view tracking
 */

export * from './auth';
export * from './categories';
export * from './profiles';
export * from './souks';
export * from './views'; 