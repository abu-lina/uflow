import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create a single supabase client for interacting with your database
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// Helper function to get all rows from a table
export async function getAll<T>(table: string): Promise<T[]> {
  const { data, error } = await supabase
    .from(table)
    .select('*');
  
  if (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
  
  return data as T[];
}

// Helper function to get a single row by id
export async function getById<T>(table: string, id: string): Promise<T | null> {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
  
  return data as T;
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