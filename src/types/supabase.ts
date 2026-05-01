export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export interface Category {
  id: string;
  category_id: string;
  name_de: string;
  name_en?: string;
  description_de?: string;
  description_en?: string;
  category_images?: Record<string, unknown>; // JSONB for category images
  applicable_section: 'food' | 'business' | 'ummah' | 'all';
  created_at: string;
  updated_at: string;
}
