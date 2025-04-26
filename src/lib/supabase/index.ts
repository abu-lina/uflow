/**
 * Supabase Infrastructure
 * 
 * This module provides Supabase-specific infrastructure code:
 * - Database client configuration
 * - Type definitions
 * - Query builders
 * - Database utilities
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create a single supabase client for interacting with your database
const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

type TableName = keyof Database['public']['Tables'];
type TableRow<T extends TableName> = Database['public']['Tables'][T]['Row'];

// Helper function to get all rows from a table
export async function getAll<T extends TableName>(table: T): Promise<TableRow<T>[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query = supabase.from(table) as any;
  const { data, error } = await query.select('*');
  
  if (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
  
  return (data || []) as TableRow<T>[];
}

// Helper function to get a single row by id
export async function getById<T extends TableName>(table: T, id: string): Promise<TableRow<T> | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query = supabase.from(table) as any;
  const { data, error } = await query
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
  
  return data as TableRow<T> | null;
}

// Helper function to insert a new row
export async function insert<T>(table: string, data: Partial<T>): Promise<T> {
  const { data: insertedData, error } = await supabase
    .from(table)
    .insert(data)
    .select()
    .single();
  
  if (error) {
    console.error('Error inserting data:', error);
    throw error;
  }
  
  return insertedData as T;
}

// Helper function to update a row
export async function update<T>(table: string, id: string, data: Partial<T>): Promise<T> {
  const { data: updatedData, error } = await supabase
    .from(table)
    .update(data)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating data:', error);
    throw error;
  }
  
  return updatedData as T;
}

// Helper function to delete a row
export async function remove(table: string, id: string): Promise<void> {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting data:', error);
    throw error;
  }
}

// Helper function to check connection status
export async function checkConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('_realtime').select('*').limit(1);
    
    // If we can connect without an error, return true
    // The actual query might fail due to permissions, but that still means the connection works
    return !error || error.code !== 'ENOTFOUND';
  } catch (error) {
    console.error('Connection check failed:', error);
    return false;
  }
}

// Export types
export type { Database };

// Client
export * from './client';

// Tables
export * from './tables/auth';
export * from './tables/bookmarks';
export * from './tables/souks';
export * from './tables/categories';

// Remove old exports
// export * from './types';
// export * from './database';
// export * from './queries/auth';
// export * from './queries/bookmarks'; 