export interface Souk {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  category: string | null;
  status: 'active' | 'inactive';
  price_range: string | null;
  rating: number | null;
  review_count: number;
} 