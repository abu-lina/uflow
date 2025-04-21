export interface SearchResult {
  souk_id: string;
  souk_name: string;
  souk_owner_id: string;
  category_id: string;
  image_url: string | null;
  description: string | null;
  address_city: string | null;
  address_street: string | null;
  address_zip: string | null;
  opening_hours: string | null;
  is_verified: boolean;
  review_feedback: string | null;
  souk_images: string | null;
  souk_logo: string | null;
  phone_number: string | null;
  website_url: string | null;
} 