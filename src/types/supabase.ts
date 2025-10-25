export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export interface Category {
  id: string;
  category_id: string;
  name_de: string;
  name_en?: string;
  description_de?: string;
  applicable_to?: string[];
  created_at: string;
  updated_at: string;
}
