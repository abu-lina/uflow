export interface SearchResult {
  souk_id: string;
  souk_name: string;
  souk_owner_id: string;
  category_id: string | null;
  souk_description: string | null;
  souk_logo: string | null;
  souk_images: string | null;
  is_verified: boolean;
  verified_at: string | null;
  verified_by: string | null;
  souk_view_count: number;
  purchase_count: number;
  created_at: string;
  updated_at: string;
  contact_email: string | null;
  contact_phone: string | null;
  social_instagram: string | null;
  social_website: string | null;
  address_street: string | null;
  address_zip: string | null;
  address_city: string | null;
  address_country: string | null;
  location_latitude: number | null;
  location_longitude: number | null;
  souk_status: string;
  review_feedback: string | null;
  profiles?: {
    full_name: string | null;
  };
} 