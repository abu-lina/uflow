import type { OpeningHours } from '@/types/openingHours';

export interface Location {
  location_id: string;
  provider_id: string;
  location_name: string | null;
  address_street: string | null;
  address_zip: string | null;
  address_city: string | null;
  address_country: string | null;
  location_latitude: number | null;
  location_longitude: number | null;
  opening_hours: OpeningHours | null;
  show_address: boolean;
  contact_phone: string | null;
  is_primary: boolean;
  created_at: string | null;
  updated_at: string | null;
}
