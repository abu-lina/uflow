/**
 * Service for fetching category-based suggestions from Supabase
 * This replaces the hardcoded constants approach
 */

import { supabase } from '@/lib/supabase/client';
import type { Offer, Need } from '@/types/offer';

export interface SuggestedOffer extends Offer {
  priority: number;
}

export interface SuggestedNeed extends Need {
  priority: number;
}

/**
 * Fetch suggested offers for a given category from database
 * @param categoryId - The category_id from the categories table
 * @returns Array of suggested offers with priority
 */
export async function getSuggestedOffersForCategory(
  categoryId: string
): Promise<SuggestedOffer[]> {
  try {
    // First, check if the table exists by trying to fetch suggestions
    const { data: suggestionData, error: suggestionError } = await supabase
      .from('category_suggested_offers')
      .select('offer_id, priority')
      .eq('category_id', categoryId)
      .order('priority', { ascending: false });

    // If table doesn't exist yet (migration not applied), return empty array
    if (suggestionError) {
      // Only log if it's not a "relation does not exist" error
      if (!suggestionError.message.includes('does not exist')) {
        console.error('Error fetching suggested offers:', suggestionError);
      }
      return [];
    }

    if (!suggestionData || suggestionData.length === 0) {
      return [];
    }

    // Get the offer IDs
    const offerIds = suggestionData.map(s => s.offer_id);

    // Fetch the actual offers
    const { data: offersData, error: offersError } = await supabase
      .from('offers')
      .select('offer_id, name_de, name_en, created_by, category_id')
      .in('offer_id', offerIds);

    if (offersError) {
      console.error('Error fetching offers:', offersError);
      return [];
    }

    // Combine offers with their priorities
    const priorityMap = new Map(
      suggestionData.map(s => [s.offer_id, s.priority])
    );

    return (offersData || []).map(offer => ({
      ...offer,
      priority: priorityMap.get(offer.offer_id) || 0,
    })).sort((a, b) => {
      // Sort by priority (desc), then name (asc)
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.name_de.localeCompare(b.name_de);
    });
  } catch (error) {
    console.error('Error in getSuggestedOffersForCategory:', error);
    return [];
  }
}

/**
 * Fetch suggested needs for a given category from database
 * @param categoryId - The category_id from the categories table
 * @returns Array of suggested needs with priority
 */
export async function getSuggestedNeedsForCategory(
  categoryId: string
): Promise<SuggestedNeed[]> {
  try {
    // First, check if the table exists by trying to fetch suggestions
    const { data: suggestionData, error: suggestionError } = await supabase
      .from('category_suggested_needs')
      .select('need_id, priority')
      .eq('category_id', categoryId)
      .order('priority', { ascending: false });

    // If table doesn't exist yet (migration not applied), return empty array
    if (suggestionError) {
      // Only log if it's not a "relation does not exist" error
      if (!suggestionError.message.includes('does not exist')) {
        console.error('Error fetching suggested needs:', suggestionError);
      }
      return [];
    }

    if (!suggestionData || suggestionData.length === 0) {
      return [];
    }

    // Get the need IDs
    const needIds = suggestionData.map(s => s.need_id);

    // Fetch the actual needs
    const { data: needsData, error: needsError } = await supabase
      .from('needs')
      .select('need_id, name_de, name_en, created_by, category_id')
      .in('need_id', needIds);

    if (needsError) {
      console.error('Error fetching needs:', needsError);
      return [];
    }

    // Combine needs with their priorities
    const priorityMap = new Map(
      suggestionData.map(s => [s.need_id, s.priority])
    );

    return (needsData || []).map(need => ({
      ...need,
      priority: priorityMap.get(need.need_id) || 0,
    })).sort((a, b) => {
      // Sort by priority (desc), then name (asc)
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.name_de.localeCompare(b.name_de);
    });
  } catch (error) {
    console.error('Error in getSuggestedNeedsForCategory:', error);
    return [];
  }
}

/**
 * Batch fetch all suggested offers and needs for a category
 * Useful for preloading data
 * @param categoryId - The category_id from the categories table
 * @returns Object containing both offers and needs
 */
export async function getSuggestionsForCategory(categoryId: string): Promise<{
  offers: SuggestedOffer[];
  needs: SuggestedNeed[];
}> {
  const [offers, needs] = await Promise.all([
    getSuggestedOffersForCategory(categoryId),
    getSuggestedNeedsForCategory(categoryId),
  ]);

  return { offers, needs };
}

/**
 * Admin function: Add a suggestion for a category
 * (To be used in future admin panel)
 */
export async function addCategorySuggestion(
  categoryId: string,
  type: 'offer' | 'need',
  itemId: string,
  priority: number = 0
): Promise<{ success: boolean; error?: string }> {
  try {
    const table = type === 'offer' ? 'category_suggested_offers' : 'category_suggested_needs';
    const column = type === 'offer' ? 'offer_id' : 'need_id';

    const { error } = await supabase.from(table).insert([
      {
        category_id: categoryId,
        [column]: itemId,
        priority,
      },
    ]);

    if (error) {
      console.error(`Error adding category suggestion:`, error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in addCategorySuggestion:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Admin function: Remove a suggestion from a category
 * (To be used in future admin panel)
 */
export async function removeCategorySuggestion(
  categoryId: string,
  type: 'offer' | 'need',
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const table = type === 'offer' ? 'category_suggested_offers' : 'category_suggested_needs';
    const column = type === 'offer' ? 'offer_id' : 'need_id';

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('category_id', categoryId)
      .eq(column, itemId);

    if (error) {
      console.error(`Error removing category suggestion:`, error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in removeCategorySuggestion:', error);
    return { success: false, error: String(error) };
  }
}

