export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export interface Category {
  category_id: string;
  name_de: string;
  name_en?: string;
}
