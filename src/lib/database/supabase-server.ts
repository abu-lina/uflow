import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/database';
import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Creates a Supabase client for use in server components
 * This client has access to the user's session via cookies
 * @returns A Supabase client with the user's session for server components
 */
export const createServerClient = () => {
  const cookieStore = cookies();
  return createServerComponentClient<Database>({ 
    cookies: () => cookieStore,
  });
};

/**
 * Creates a Supabase admin client with direct database access
 * This should only be used in protected server contexts
 * @returns A Supabase client with admin privileges
 * @throws Error if environment variables are missing
 */
export const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required Supabase environment variables');
  }
  
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });
};

/**
 * Type definition for database errors
 */
type DatabaseError = {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
  originalError?: PostgrestError;
};

/**
 * Generic function to fetch all rows from a table with filtering options
 * @param table Table name to query
 * @param options Query options
 * @returns The fetched data as an array
 * @throws Error with database error details if the operation fails
 */
export async function getAll<T>(
  table: string, 
  options?: {
    select?: string;
    filters?: { column: string; value: unknown; operator?: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'like' | 'ilike' }[];
    order?: { column: string; ascending?: boolean };
    limit?: number;
    offset?: number;
  }
): Promise<T[]> {
  try {
    const supabase = createServerClient();
    let query = supabase.from(table).select(options?.select || '*');

    // Apply filters if provided
    if (options?.filters && options.filters.length > 0) {
      options.filters.forEach(filter => {
        const { column, value, operator = 'eq' } = filter;
        
        switch (operator) {
          case 'eq':
            query = query.eq(column, value);
            break;
          case 'neq':
            query = query.neq(column, value);
            break;
          case 'gt':
            query = query.gt(column, value);
            break;
          case 'lt':
            query = query.lt(column, value);
            break;
          case 'gte':
            query = query.gte(column, value);
            break;
          case 'lte':
            query = query.lte(column, value);
            break;
          case 'like':
            if (typeof value === 'string') {
              query = query.like(column, value);
            } else {
              console.warn(`Invalid value type for 'like' operator on column ${column}. Expected string.`);
            }
            break;
          case 'ilike':
            if (typeof value === 'string') {
              query = query.ilike(column, value);
            } else {
              console.warn(`Invalid value type for 'ilike' operator on column ${column}. Expected string.`);
            }
            break;
        }
      });
    }

    // Apply ordering
    if (options?.order) {
      query = query.order(options.order.column, {
        ascending: options.order.ascending ?? true
      });
    }

    // Apply pagination
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, (options.offset + (options.limit ?? 10)) - 1);
    }

    const { data, error } = await query;
    
    if (error) {
      const dbError: DatabaseError = {
        message: `Failed to fetch data from ${table}`,
        code: error.code,
        details: error.details,
        hint: error.hint,
        originalError: error,
      };
      throw dbError;
    }
    
    return data as T[];
  } catch (error) {
    console.error(`Error in getAll(${table}):`, error);
    throw error;
  }
}

/**
 * Get a single row by its ID
 * @param table Table name
 * @param id Row ID
 * @param options Query options
 * @returns The fetched row or null if not found
 * @throws Error with database error details if the operation fails
 */
export async function getById<T>(
  table: string, 
  id: string,
  options?: {
    select?: string;
    idColumn?: string;
  }
): Promise<T | null> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from(table)
      .select(options?.select || '*')
      .eq(options?.idColumn || 'id', id)
      .single();
    
    if (error) {
      // Return null for not found errors
      if (error.code === 'PGRST116') {
        return null;
      }
      
      const dbError: DatabaseError = {
        message: `Failed to fetch ${table} with ID ${id}`,
        code: error.code,
        details: error.details,
        hint: error.hint,
        originalError: error,
      };
      throw dbError;
    }
    
    return data as T;
  } catch (error) {
    console.error(`Error in getById(${table}, ${id}):`, error);
    throw error;
  }
}

/**
 * Insert a new row into a table
 * @param table Table name
 * @param data Data to insert
 * @returns The inserted data
 * @throws Error with database error details if the operation fails
 */
export async function insert<T, R = T>(table: string, data: T): Promise<R> {
  try {
    const supabase = createServerClient();
    const { data: insertedData, error } = await supabase
      .from(table)
      .insert(data)
      .select()
      .single();
    
    if (error) {
      const dbError: DatabaseError = {
        message: `Failed to insert into ${table}`,
        code: error.code,
        details: error.details,
        hint: error.hint,
        originalError: error,
      };
      throw dbError;
    }
    
    return insertedData as R;
  } catch (error) {
    console.error(`Error in insert(${table}):`, error);
    throw error;
  }
}

/**
 * Update a row by its ID
 * @param table Table name
 * @param id Row ID
 * @param data Data to update
 * @param options Update options
 * @returns The updated data
 * @throws Error with database error details if the operation fails
 */
export async function update<T, R = T>(
  table: string, 
  id: string, 
  data: T,
  options?: {
    idColumn?: string;
  }
): Promise<R> {
  try {
    const supabase = createServerClient();
    const { data: updatedData, error } = await supabase
      .from(table)
      .update(data)
      .eq(options?.idColumn || 'id', id)
      .select()
      .single();
    
    if (error) {
      const dbError: DatabaseError = {
        message: `Failed to update ${table} with ID ${id}`,
        code: error.code,
        details: error.details,
        hint: error.hint,
        originalError: error,
      };
      throw dbError;
    }
    
    return updatedData as R;
  } catch (error) {
    console.error(`Error in update(${table}, ${id}):`, error);
    throw error;
  }
}

/**
 * Delete a row by its ID
 * @param table Table name
 * @param id Row ID
 * @param options Delete options
 * @throws Error with database error details if the operation fails
 */
export async function remove(
  table: string, 
  id: string,
  options?: {
    idColumn?: string;
  }
): Promise<void> {
  try {
    const supabase = createServerClient();
    const { error } = await supabase
      .from(table)
      .delete()
      .eq(options?.idColumn || 'id', id);
    
    if (error) {
      const dbError: DatabaseError = {
        message: `Failed to delete from ${table} with ID ${id}`,
        code: error.code,
        details: error.details,
        hint: error.hint,
        originalError: error,
      };
      throw dbError;
    }
  } catch (error) {
    console.error(`Error in remove(${table}, ${id}):`, error);
    throw error;
  }
}

/**
 * Check if the database connection is working
 * @returns True if the connection is working, false otherwise
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const supabase = createServerClient();
    const { error } = await supabase.from('_realtime').select('*').limit(1);
    return !error;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
} 