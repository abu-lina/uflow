/**
 * @fileoverview Supabase table operations for item views
 * @module supabase/tables/views
 */

import { supabase } from '@/lib/supabase/client';

/**
 * Records a view for an item
 * @param itemId - Item ID
 * @param userId - User ID
 * @returns Promise<void>
 */
export const recordView = async (itemId: string, userId: string) => {
  const { error } = await supabase
    .from('views')
    .insert({
      item_id: itemId,
      user_id: userId,
      viewed_at: new Date().toISOString()
    });

  if (error) {
    throw error;
  }
};

/**
 * Gets view count for an item
 * @param itemId - Item ID
 * @returns Promise<number> View count
 */
export const getViewCount = async (itemId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('views')
    .select('*', { count: 'exact', head: true })
    .eq('item_id', itemId);

  if (error) {
    throw error;
  }

  return count || 0;
}; 