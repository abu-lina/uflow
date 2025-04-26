/**
 * @fileoverview Supabase table operations for souks
 * @module supabase/tables/souks
 */

import { supabase } from '@/lib/supabase/client';
import { Souk } from '@/types/souks';
import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Fetches all souks with optional filtering and pagination
 * @param options - Query options including filters, pagination, and sorting
 * @returns Promise<{ data: Souk[] | null; error: PostgrestError | null; count: number | null; page: number; pageSize: number }>
 */
export const getSouks = async (options?: {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: 'asc' | 'desc';
  category?: string;
}): Promise<{
  data: Souk[] | null;
  error: PostgrestError | null;
  count: number | null;
  page: number;
  pageSize: number;
}> => {
  const { page = 1, pageSize = 10, search, sort, category } = options || {};

  let query = supabase
    .from('souks')
    .select('*', { count: 'exact' });

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  if (category) {
    query = query.eq('category', category);
  }

  if (sort) {
    query = query.order('created_at', { ascending: sort === 'asc' });
  }

  const { data, error, count } = await query
    .range((page - 1) * pageSize, page * pageSize - 1);

  return {
    data,
    error,
    count,
    page,
    pageSize,
  };
};

/**
 * Creates a new souk listing
 * @param souk - Souk data
 * @returns Promise<{ data: Souk | null; error: PostgrestError | null }>
 */
export const createSouk = async (souk: Omit<Souk, 'id' | 'created_at'>): Promise<{ data: Souk | null; error: PostgrestError | null }> => {
  const { data, error } = await supabase
    .from('souks')
    .insert(souk)
    .select()
    .single();

  return { data, error };
};

/**
 * Fetches a single souk by ID
 * @param id - Souk ID
 * @returns Promise<Souk | null> Souk data or null if not found
 */
export const getSoukById = async (id: string): Promise<Souk | null> => {
  const { data, error } = await supabase
    .from('souks')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw error;
  }

  return data;
};

/**
 * Updates an existing souk listing
 * @param id - Souk ID
 * @param souk - Updated souk data
 * @returns Promise<Souk> Updated souk
 */
export const updateSouk = async (id: string, souk: Partial<Souk>): Promise<Souk> => {
  const { data, error } = await supabase
    .from('souks')
    .update(souk)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

/**
 * Deletes a souk listing
 * @param id - Souk ID
 * @returns Promise<void>
 */
export const deleteSouk = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('souks')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }
}; 