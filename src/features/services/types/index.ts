export type ServiceStatus = 'draft' | 'published' | 'rejected' | 'archived' | 'suspended';

export interface ServiceOwner {
  id: string;
  full_name: string;
  avatar_url?: string;
}

export interface ServiceUser {
  user_id?: string;
  id?: string;
  email: string;
}

export interface ServiceCategory {
  category_id: string;
  name_en: string;
}

export interface Service {
  service_id: string;
  service_owner_id: string;
  service_name: string;
  service_description?: string;
  service_logo?: string | {
    url: string;
    alt?: string;
  };
  is_verified?: boolean;
  verified_at?: string;
  verified_by?: string;
  service_view_count?: number;
  purchase_count?: number;
  category_id?: string;
  created_at?: string;
  updated_at?: string;
  contact_email?: string;
  contact_phone?: string;
  social_instagram?: string;
  social_website?: string;
  address_street?: string;
  address_zip?: string;
  address_country?: string;
  location_latitude?: number;
  location_longitude?: number;
  service_status?: ServiceStatus;
  owner?: ServiceOwner;
  users?: ServiceUser | ServiceUser[];
  categories?: ServiceCategory | ServiceCategory[];
}

export interface ServiceListItem extends Pick<Service, 
  'service_id' | 
  'service_name' | 
  'service_description' | 
  'service_logo' | 
  'category_id' | 
  'contact_email' | 
  'contact_phone' | 
  'address_country' | 
  'owner'
> {
  price?: number;
  location?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ServiceListProps {
  services: ServiceListItem[];
  pagination: PaginationParams;
} 