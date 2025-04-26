/**
 * @fileoverview Types for category-related entities
 * @module types/categories
 */

/**
 * Represents a category
 */
export interface Category {
  category_id: string;
  name_en: string;
  name_de: string;
  name_ar: string;
  description?: string;
  image_url?: string;
  created_at: string;
  updated_at?: string;
}

export type CategoryName = {
  en: string;
  de: string;
  ar: string;
};

export type CategoryId = Category['category_id']; 