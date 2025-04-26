/**
 * @fileoverview Supabase table operations for categories
 * @module supabase/tables/categories
 */

import { supabase } from '@/lib/supabase/client';
import { Category } from '@/types/categories';

/**
 * Fetches all categories from the database
 * @returns Promise<Category[]> List of categories
 */
export const getCategories = async (): Promise<Category[]> => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name_en');

  if (error) {
    throw error;
  }

  return data || [];
};

/**
 * Fetches a single category by ID
 * @param categoryId - Category ID
 * @returns Promise<Category | null> Category data or null if not found
 */
export const getCategoryById = async (categoryId: string): Promise<Category | null> => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('category_id', categoryId)
    .single();

  if (error) {
    throw error;
  }

  return data;
};

/**
 * Gets the localized name of a category based on the current language
 * @param category - The category object
 * @param locale - The current locale (en, de, or ar)
 * @returns The localized name of the category
 */
export const getLocalizedCategoryName = (category: Category, locale: string): string => {
  switch (locale) {
    case 'en':
      return category.name_en;
    case 'de':
      return category.name_de;
    case 'ar':
      return category.name_ar;
    default:
      return category.name_en;
  }
};

/**
 * Creates a new category
 * @param category - Category data
 * @returns Promise<Category> Created category
 */
export const createCategory = async (category: Omit<Category, 'category_id'>): Promise<Category> => {
  const { data, error } = await supabase
    .from('categories')
    .insert(category)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

/**
 * Updates an existing category
 * @param categoryId - Category ID
 * @param category - Updated category data
 * @returns Promise<Category> Updated category
 */
export const updateCategory = async (categoryId: string, category: Partial<Category>): Promise<Category> => {
  const { data, error } = await supabase
    .from('categories')
    .update(category)
    .eq('category_id', categoryId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

/**
 * Deletes a category
 * @param categoryId - Category ID
 * @returns Promise<void>
 */
export const deleteCategory = async (categoryId: string): Promise<void> => {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('category_id', categoryId);

  if (error) {
    throw error;
  }
}; 