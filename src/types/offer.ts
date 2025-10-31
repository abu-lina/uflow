export interface Offer {
  offer_id: string;
  name_de: string;
  name_en?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
  category_id?: string | null;
}

export interface Need {
  need_id: string;
  name_de: string;
  name_en?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
  category_id?: string | null;
}
