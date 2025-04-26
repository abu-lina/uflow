/**
 * @fileoverview Types for souk-related entities
 * @module types/souks
 */

/**
 * Represents a souk listing
 */
export interface Souk {
  id: string;
  title: string;
  description: string;
  price: number;
  category_id: string;
  user_id: string;
  image_urls?: string[];
  condition: 'new' | 'like-new' | 'good' | 'fair' | 'poor';
  status: 'active' | 'sold' | 'inactive';
  location?: string;
  created_at: string;
  updated_at?: string;
} 